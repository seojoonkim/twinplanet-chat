import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// ── 환경변수 ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const OPENROUTER_API_KEY = (process.env.OPENROUTER_API_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENROUTER_API_KEY) {
  console.error('❌ 필수 환경변수 누락: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENROUTER_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── 멤버 메타 ─────────────────────────────────────────────────────────────────
const MEMBER_NAME = {
  mizyu: 'MIZYU',
  rin: 'RIN',
  suzuka: 'SUZUKA',
  kanon: 'KANON',
  nako: '矢吹奈子',
  nana: '鈴木奈々',
  taiyo: '杉浦太陽',
  yoshiaki: 'よしあき',
  michi: 'ミチ',
};

const MEMBER_KEYWORDS = {
  mizyu: ['MIZYU', 'みずゆ', 'ミズユ', 'ミジュコプター'],
  rin: ['RIN', 'りん', 'リン', 'ラップ'],
  suzuka: ['SUZUKA', 'すずか', 'スズカ', '関西弁'],
  kanon: ['KANON', 'かのん', 'カノン', 'クラシックダンス'],
  nako: ['奈子', '矢吹', 'nako', '야부키'],
  nana: ['奈々', '鈴木奈々', 'nana', '스즈키'],
  taiyo: ['太陽', '杉浦', 'taiyo', '타이요'],
  yoshiaki: ['よしあき', 'yoshiaki', '요시아키', 'ONSENSE'],
  michi: ['ミチ', 'michi', '미치', 'よしミチ'],
};

const ALL_MEMBER_IDS = Object.keys(MEMBER_NAME);

// ── 태그 감지 ─────────────────────────────────────────────────────────────────
function detectMemberTags(text) {
  const found = [];
  // 설린·혜린에 '린' 단독 매칭 방지
  const normalizedText = text
    .replace(/설린/g, 'SEOLLIN')
    .replace(/혜린/g, 'HYERIN');

  for (const [id, keywords] of Object.entries(MEMBER_KEYWORDS)) {
    const searchText = id === 'rin' ? normalizedText : text;
    if (keywords.some(kw => searchText.includes(kw))) found.push(id);
  }
  return found;
}

// ── idol 파일 읽기 ────────────────────────────────────────────────────────────
async function readIdolFile(idolId, filename) {
  const filePath = join(PROJECT_ROOT, 'public', 'idols', idolId, filename);
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

// ── Anthropic 댓글 생성 ───────────────────────────────────────────────────────
async function generateComment(idolId, title, content, isReply = false, originalComment = '') {
  const name = MEMBER_NAME[idolId] || idolId;
  const personality = await readIdolFile(idolId, 'personality.md');
  const speechPatterns = await readIdolFile(idolId, 'speech-patterns.md');

const contentPreview = (content || '').slice(0, 100);

  let userPrompt;
  if (isReply) {
    userPrompt = `게시글 제목: ${title}\n게시글 내용: ${contentPreview}\n\n멤버가 남긴 댓글: ${originalComment}\n\n${name}의 짧은 대댓글 (30자 이내, 이모지 1개):`;
  } else {
    userPrompt = `게시글 제목: ${title}\n게시글 내용: ${contentPreview}\n\n${name}의 댓글:`;
  }

  const systemPrompt = `あなたはTWIN PLANETタレント ${name}です。ファンが投稿した掲示板の記事に短いコメントを残してください。

ペルソナ:
${personality || '(ファイルなし)'}

話し方:
${speechPatterns || '(ファイルなし)'}

ルール:
- コメントは1〜2文、最大80文字
- 自然な反応（かわいい、面白い、共感など）
- 日本語で
- 絵文字1〜2個適切に
- '@{ニックネーム}'のようなメンション ❌
- 自分の名前を言わない ❌
- 「ファンの皆さん」のような公式な表現 ❌`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      max_tokens: 150,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API 오류 ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '';
  return text;
}

// ── 태그 없는 게시글용 댓글 자동 선택 생성 ────────────────────────────────
async function generateCommentsForUntaggedPost(title, content) {
  const userPrompt = `게시글 제목: ${title}
게시글 내용: ${content}

No specific members were tagged. Choose 1-2 members from the TWIN PLANET talent who would naturally react to this post based on its content. Available members: MIZYU(mizyu), RIN(rin), SUZUKA(suzuka), KANON(kanon), 矢吹奈子(nako), 鈴木奈々(nana), 杉浦太陽(taiyo), よしあき(yoshiaki), ミチ(michi).
For each chosen member, write a short natural comment (1-2 sentences, under 60 chars) that fits the post content.
Return JSON: [{"idol_id": "nako", "content": "comment"}, ...]
Member IDs: mizyu=MIZYU, rin=RIN, suzuka=SUZUKA, kanon=KANON, nako=矢吹奈子, nana=鈴木奈々, taiyo=杉浦太陽, yoshiaki=よしあき, michi=ミチ.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      max_tokens: 250,
      messages: [
        { role: 'system', content: 'あなたはTWIN PLANETタレントのファン向けコメント生成器です。投稿を見てタレントの自然な反応を選びJSONのみで回答してください。' },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API 오류 ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || '';
  let text = raw;

  if (!text.startsWith('[')) {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end > start) {
      text = text.slice(start, end + 1);
    }
  }

  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(item => item && typeof item.idol_id === 'string' && typeof item.content === 'string')
      .filter(item => ALL_MEMBER_IDS.includes(item.idol_id.trim()))
      .map(item => ({ idol_id: item.idol_id.trim(), content: item.content.trim() }))
      .slice(0, 2);
  } catch {
    return [];
  }
}

// ── 무작위 선택 helper ────────────────────────────────────────────────────────
function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ── 라이브 RADAR 피드 fetch ───────────────────────────────────────────────────
async function fetchLiveFeedItems() {
  const BASE = 'https://twinplanet.chat';
  const endpoints = [
    { url: `${BASE}/api/feed-togetter`, key: 'posts' },
    { url: `${BASE}/api/feed-community`, key: 'posts' },
    { url: `${BASE}/api/feed-twitter`, key: 'tweets' },
    { url: `${BASE}/api/feed-twitter-fan`, key: 'posts' },
  ];
  const allItems = [];
  for (const { url, key } of endpoints) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'twinplanet-comment-bot/1.0' } });
      if (!res.ok) { console.log(`[feed] ${url} → ${res.status}`); continue; }
      const data = await res.json();
      const items = data[key] || data.items || (Array.isArray(data) ? data : []);
      console.log(`[feed] ${url.split('/').pop()} → ${items.length}개`);
      allItems.push(...items);
    } catch (e) {
      console.log(`[feed] ${url.split('/').pop()} 오류: ${e.message}`);
    }
  }
  return allItems;
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  // 1. 라이브 RADAR 피드 fetch
  const allItems = await fetchLiveFeedItems();
  console.log(`📋 전체 포스트: ${allItems.length}개`);

  // 2. 이미 처리된 post_id 목록 조회
  const { data: existingRows, error: fetchError } = await supabase
    .from('community_comments')
    .select('post_id')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Supabase 조회 오류:', fetchError.message);
    process.exit(1);
  }

  const processedPostIds = new Set((existingRows || []).map(r => r.post_id));
  console.log(`✅ 이미 처리된 post_id: ${processedPostIds.size}개`);

  // 3. 새 포스트 필터 (최대 50개)
  const newItems = allItems
    .filter(item => !processedPostIds.has(item.id))
    .slice(0, 50);

  console.log(`🆕 처리할 새 포스트: ${newItems.length}개`);

  if (newItems.length === 0) {
    console.log('처리할 새 포스트 없음. 종료.');
    return;
  }

  // 4. 포스트별 처리
  for (const rawItem of newItems) {
    // 필드 정규화 (Twitter: text, Reddit: title+selftext, News: title+content)
    const item = {
      ...rawItem,
      title: rawItem.title || rawItem.text?.slice(0, 60) || '',
      content: rawItem.content || rawItem.selftext || rawItem.text || rawItem.body || '',
    };
    const text = (item.title || '') + ' ' + (item.content || '');
    const taggedMembers = detectMemberTags(text);

    console.log(`\n📌 [${item.id}] "${item.title?.slice(0, 40)}"`);
    console.log(`   태그된 멤버: ${taggedMembers.map(id => MEMBER_NAME[id]).join(', ') || '없음'}`);

    const insertedComments = [];
    const selectedMembers =
      taggedMembers.length > 0
        ? pickRandom(taggedMembers, Math.min(2, taggedMembers.length))
        : [];

    if (taggedMembers.length > 0) {
      console.log(`   선택된 멤버: ${selectedMembers.map(id => MEMBER_NAME[id]).join(', ')}`);

      for (const idolId of selectedMembers) {
        try {
          const commentText = await generateComment(idolId, item.title || '', item.content || '');
          if (!commentText) continue;

          const { data: inserted, error: insertError } = await supabase
            .from('community_comments')
            .insert({
              post_id: item.id,
              idol_id: idolId,
              content: commentText,
              is_reply: false,
              reply_to_comment_id: null,
            })
            .select()
            .single();

          if (insertError) {
            console.error(`   ❌ INSERT 실패 (${idolId}):`, insertError.message);
          } else {
            console.log(`   💬 [${MEMBER_NAME[idolId]}] ${commentText}`);
            insertedComments.push({ ...inserted, idol_id: idolId });
          }
        } catch (e) {
          console.error(`   ❌ 댓글 생성 실패 (${idolId}):`, e.message);
        }

        // API 레이트 리밋 방지용 짧은 딜레이
        await new Promise(r => setTimeout(r, 500));
      }
    } else {
      try {
        const generatedComments = await generateCommentsForUntaggedPost(item.title || '', item.content || '');
        console.log(`   선택된 멤버: ${generatedComments.map(entry => MEMBER_NAME[entry.idol_id]).join(', ')}`);

        for (const entry of generatedComments) {
          try {
            const { data: inserted, error: insertError } = await supabase
              .from('community_comments')
              .insert({
                post_id: item.id,
                idol_id: entry.idol_id,
                content: entry.content,
                is_reply: false,
                reply_to_comment_id: null,
              })
              .select()
              .single();

            if (insertError) {
              console.error(`   ❌ INSERT 실패 (${entry.idol_id}):`, insertError.message);
            } else {
              console.log(`   💬 [${MEMBER_NAME[entry.idol_id]}] ${entry.content}`);
              insertedComments.push({ ...inserted, idol_id: entry.idol_id });
            }
          } catch (e) {
            console.error(`   ❌ 댓글 생성 실패 (${entry.idol_id}):`, e.message);
          }

          // API 레이트 리밋 방지용 짧은 딜레이
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (e) {
        console.error(`   ❌ 태그없는 게시글 댓글 생성 실패:`, e.message);
      }
    }

    // 5. 30% 확률로 대댓글
    if (insertedComments.length > 0 && Math.random() < 0.3) {
      // 댓글 단 멤버 제외한 대상 멤버 중 1명 선택
      const commentedIds = new Set(insertedComments.map(c => c.idol_id));
      const replyCandidates = taggedMembers.length > 0 ? taggedMembers : ALL_MEMBER_IDS;
      const replyableMembers = replyCandidates.filter(id => !commentedIds.has(id));

      if (replyableMembers.length > 0) {
        const replyMemberId = pickRandom(replyableMembers, 1)[0];
        const targetComment = insertedComments[Math.floor(Math.random() * insertedComments.length)];

        try {
          const replyText = await generateComment(
            replyMemberId,
            item.title || '',
            item.content || '',
            true,
            targetComment.content
          );

          if (replyText) {
            const { error: replyError } = await supabase
              .from('community_comments')
              .insert({
                post_id: item.id,
                idol_id: replyMemberId,
                content: replyText,
                is_reply: true,
                reply_to_comment_id: targetComment.id,
              });

            if (replyError) {
              console.error(`   ❌ 대댓글 INSERT 실패:`, replyError.message);
            } else {
              console.log(`   ↩️  [${MEMBER_NAME[replyMemberId]}] ${replyText}`);
            }
          }
        } catch (e) {
          console.error(`   ❌ 대댓글 생성 실패:`, e.message);
        }
      }
    }
  }

  console.log('\n✅ 완료!');
}

main().catch(e => {
  console.error('❌ 예상치 못한 오류:', e);
  process.exit(1);
});
