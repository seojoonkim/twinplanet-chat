import { create } from 'zustand';
import type { IdolMeta, KnowledgeCategory } from '@/types/idol';
import { KNOWLEDGE_CATEGORIES } from '@/types/idol';
import * as db from '@/lib/db';
import { loadAllIdols, loadIdolKnowledge } from '@/lib/idol-loader';

// ─── localStorage cache helpers ──────────────────────────────
const CACHE_KEY = 'tsc_idol_cache_v2';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface IdolCache {
  idols: IdolMeta[];
  cachedAt: number;
}

function getIdolCache(): IdolMeta[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { idols, cachedAt }: IdolCache = JSON.parse(raw);
    if (Date.now() - cachedAt > CACHE_TTL) return null;
    return idols && idols.length > 0 ? idols : null;
  } catch {
    return null;
  }
}

function saveIdolCache(idols: IdolMeta[]): void {
  try {
    const cache: IdolCache = { idols, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage might be full — ignore
  }
}

/** Initialize from cache for instant render on return visits */
function getInitialState(): { idols: IdolMeta[]; loading: boolean } {
  const cached = getIdolCache();
  if (cached) return { idols: cached, loading: false };
  return { idols: [], loading: true };
}

const initialState = getInitialState();

// ─── Store interface ──────────────────────────────────────────
interface IdolStore {
  idols: IdolMeta[];
  loading: boolean;
  error: string | null;

  loadIdols: () => Promise<void>;
  addIdol: (
    meta: Omit<IdolMeta, 'createdAt' | 'updatedAt' | 'isBuiltIn'>,
  ) => Promise<IdolMeta>;
  updateIdolMeta: (id: string, updates: Partial<IdolMeta>) => Promise<void>;
  deleteIdol: (id: string) => Promise<void>;
  resetBuiltInIdol: (id: string) => Promise<void>;

  getKnowledge: (
    idolId: string,
  ) => Promise<Record<KnowledgeCategory, string>>;
  saveKnowledgeFile: (
    idolId: string,
    category: KnowledgeCategory,
    content: string,
  ) => Promise<void>;
  resetKnowledgeFile: (
    idolId: string,
    category: KnowledgeCategory,
  ) => Promise<void>;
}

export const useIdolStore = create<IdolStore>((set, get) => ({
  idols: initialState.idols,
  loading: initialState.loading,
  error: null,

  loadIdols: async () => {
    // If we already have idols (from cache or previous load), don't block UI
    // but still fetch fresh data silently to keep cache up to date
    const hasCachedIdols = get().idols.length > 0;
    if (!hasCachedIdols) {
      set({ loading: true, error: null });
    }
    try {
      const idols = await loadAllIdols();
      set({ idols, loading: false });
      saveIdolCache(idols);
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  addIdol: async (metaInput) => {
    const now = Date.now();
    const meta: IdolMeta = {
      ...metaInput,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.putIdolMeta(meta);

    // Create empty knowledge files
    for (const category of KNOWLEDGE_CATEGORIES) {
      await db.putKnowledgeFile({
        idolId: meta.id,
        category,
        content: '',
        updatedAt: now,
      });
    }

    await get().loadIdols();
    return meta;
  },

  updateIdolMeta: async (id, updates) => {
    const existing =
      get().idols.find((i) => i.id === id) ??
      (await db.getIdolMeta(id));
    if (!existing) return;

    const updated: IdolMeta = {
      ...existing,
      ...updates,
      id, // prevent id change
      updatedAt: Date.now(),
    };
    await db.putIdolMeta(updated);
    await get().loadIdols();
  },

  deleteIdol: async (id) => {
    await db.deleteIdolMeta(id);
    await db.deleteAllKnowledgeForIdol(id);
    await get().loadIdols();
  },

  resetBuiltInIdol: async (id) => {
    // Remove IndexedDB overrides so static files are used
    await db.deleteIdolMeta(id);
    await db.deleteAllKnowledgeForIdol(id);
    await get().loadIdols();
  },

  getKnowledge: async (idolId) => {
    // Find idol to get agencyId and group
    const idol = get().idols.find((i) => i.id === idolId);
    return loadIdolKnowledge(idolId, idol?.agencyId, idol?.group);
  },

  saveKnowledgeFile: async (idolId, category, content) => {
    await db.putKnowledgeFile({
      idolId,
      category,
      content,
      updatedAt: Date.now(),
    });
  },

  resetKnowledgeFile: async (idolId, category) => {
    const dbFile = await db.getKnowledgeFile(idolId, category);
    if (dbFile) {
      const dbObj = await db.getDB();
      await dbObj.delete('idol-knowledge', [idolId, category]);
    }
  },
}));
