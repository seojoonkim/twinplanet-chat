import { useEffect, useState } from 'react';
import type { IdolMeta, KnowledgeCategory } from '@/types/idol';
import { loadIdolKnowledge, loadGroupInfo, getGroupSlug } from '@/lib/idol-loader';
import { assembleSystemPrompt, type UserInfo } from '@/lib/prompt-assembler';
import { useUserStore } from '@/stores/user-store';

export function useSystemPrompt(idol: IdolMeta | null) {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [knowledge, setKnowledge] = useState<Record<KnowledgeCategory, string> | null>(null);
  const [loading, setLoading] = useState(false);
  
  const profile = useUserStore((s) => s.profile);
  // Watch the actual relation object, not the getter function (for proper reactivity)
  const idolRelations = useUserStore((s) => s.idolRelations);
  const relation = idol ? idolRelations[idol.id] : null;

  useEffect(() => {
    if (!idol) {
      setSystemPrompt('');
      setKnowledge(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Build user info
    const userInfo: UserInfo | undefined = profile && relation ? {
      name: profile.name,
      birthday: profile.birthday || '(비공개)',
      relationType: relation.relationType,
    } : undefined;
    
    console.log('[SystemPrompt] Building with userInfo:', userInfo);

    // Read 1:1 memory from localStorage
    let memoryContext: string | undefined;
    try {
      const raw = localStorage.getItem(`tsc_mem_${idol.id}`);
      if (raw) {
        const mem = JSON.parse(raw) as { messages?: Array<{ role: string; content: string }>; lastVisit?: string };
        if (mem.messages && mem.messages.length > 0) {
          // STORE 30 messages in localStorage (unchanged), but INJECT only last 10 to reduce tokens (~67% reduction)
          const lines = mem.messages
            .slice(-10)
            .map((m) => `${m.role === 'user' ? '팬' : '나'}: ${m.content}`)
            .join('\n');
          memoryContext = `마지막 방문: ${mem.lastVisit ? new Date(mem.lastVisit).toLocaleDateString('ko-KR') : '알 수 없음'}\n최근 대화:\n${lines}`;
        }
      }
    } catch {
      // ignore localStorage errors
    }

    Promise.all([
      loadIdolKnowledge(idol.id),
      loadGroupInfo(getGroupSlug(idol.group)),
    ]).then(([loadedKnowledge, groupInfo]) => {
      if (!cancelled) {
        setKnowledge(loadedKnowledge);
        setSystemPrompt(assembleSystemPrompt(idol, loadedKnowledge, groupInfo, userInfo, memoryContext));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [idol?.id, idol?.updatedAt, profile, relation]);

  return { systemPrompt, knowledge, loading };
}

/** Build system prompt with optional unsaved overrides (for admin test chat) */
export function useSystemPromptWithOverrides(
  idol: IdolMeta | null,
  overrides?: Record<string, string>,
) {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!idol) {
      setSystemPrompt('');
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      loadIdolKnowledge(idol.id),
      loadGroupInfo(getGroupSlug(idol.group)),
    ]).then(([knowledge, groupInfo]) => {
      if (!cancelled) {
        const merged = { ...knowledge } as Record<KnowledgeCategory, string>;
        if (overrides) {
          for (const [key, value] of Object.entries(overrides)) {
            merged[key as KnowledgeCategory] = value;
          }
        }
        setSystemPrompt(assembleSystemPrompt(idol, merged, groupInfo));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [idol?.id, idol?.updatedAt, overrides]);

  return { systemPrompt, loading };
}
