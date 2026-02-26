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
const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ANTHROPIC_API_KEY) {
  console.error('❌ 필수 환경변수 누락: SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── 멤버 메타 ─────────────────────────────────────────────────────────────────
const MEMBER_NAME = {
  seoyeon: '서연', hyerin: '혜린', jiwoo: '지우', chaeyeon: '채연',
  yooyeon: '유연', sumin: '수민', naekyung: '나경', yubin: '유빈',
  kaede: '카에데', dahyun: '다현', kotone: '코토네', yeonji: '연지',
  nien: '니엔', sohyun: '소현', shinwi: '신위', mayu: '마유',
  rin: '린', jubin: '주빈', hayeon: '하연', sion: '시온',
  chaewon: '채원', seollin: '설린', seoa: '서아', jiyeon: '지연', jbk: '정병기',
};

const MEMBER_KEYWORDS = {
  seoyeon:  ['서연', '윤서연', '서연이'],
  hyerin:   ['혜린', '정혜린', '혜린이'],
  jiwoo:    ['지우', '이지우', '지우야'],
  chaeyeon: ['채연', '김채연', '채채'],
  yooyeon:  ['유연', '김유연'],
  sumin:    ['수민', '김수민', '수민이'],
  naekyung: ['나경', '김나경', '나키', '나킹'],
  yubin:    ['유빈', '공유빈', '유밤미', '공뿌'],
  kaede:    ['카에데', '카에', 'kaede', 'Kaede', 'KaedeTimes'],
  dahyun:   ['다현', '서다현', '다현이'],
  kotone:   ['코토네', '코토', '토네', 'kotone'],
  yeonji:   ['연지', '곽연지', '연지야'],
  nien:     ['니엔', '녠', '넨', 'nien'],
  sohyun:   ['소현', '박소현', '소현이'],
  shinwi:   ['신위', '신위야'],
  mayu:     ['마유', 'mayu'],
  rin:      ['린', 'rin'],
  jubin:    ['주빈', '주빈이', '멍재현'],
  seollin:  ['설린', '설린이'],
  seoa:     ['서아', '서아야'],
  sion:     ['시온', '시온이'],
  hayeon:   ['하연', '하연이'],
  jiyeon:   ['지연', '지연이'],
  chaewon:  ['채원', '채채'],
  jbk:      ['정병기', '병기', '병기형', '제이든', '병기햄', 'jbk', 'JBK', 'Jayden'],
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

  const systemPrompt = `너는 tripleS 멤버 ${name}야. 아래 personality와 speech-patterns를 참고해서 팬이 올린 DCinside/더쿠/트위터 게시글에 짧은 댓글을 달아줘.

페르소나:
${personality || '(파일 없음)'}

말투:
${speechPatterns || '(파일 없음)'}

규칙:
- 댓글은 1~2문장, 최대 80자
- 자연스러운 반응 (귀엽다, 웃기다, 공감, 짧은 팩폭 등)
- 한국어로
- 이모지 1-2개 적절히
- '@{작성자닉네임}' 같은 멘션 ❌
- 자기 이름 언급 ❌
- "팬 여러분" 같은 공식적 표현 ❌`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API 오류 ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text?.trim() || '';
  return text;
}

// ── 태그 없는 게시글용 댓글 자동 선택 생성 ────────────────────────────────
async function generateCommentsForUntaggedPost(title, content) {
  const userPrompt = `게시글 제목: ${title}
게시글 내용: ${content}

No specific members were tagged. Choose 1-2 members from the tripleS group who would naturally react to this post based on its content. Available members: 서연, 혜린, 지우, 채연, 유연, 수민, 나경, 유빈, 카에데, 다현, 코토네, 연지, 니엔, 소현, 신위, 마유, 린, 주빈, 설린, 서아, 시온, 하연, 지연, 채원, 정병기(jbk).
For each chosen member, write a short natural comment (1-2 sentences, under 60 chars) that fits the post content.
Return JSON: [{"idol_id": "hyerin", "content": "comment"}, ...]
Member IDs: seoyeon=서연, hyerin=혜린, jiwoo=지우, chaeyeon=채연, yooyeon=유연, sumin=수민, naekyung=나경, yubin=유빈, kaede=카에데, dahyun=다현, kotone=코토네, yeonji=연지, nien=니엔, sohyun=소현, shinwi=신위, mayu=마유, rin=린, jubin=주빈, seollin=설린, seoa=서아, sion=시온, hayeon=하연, jiyeon=지연, chaewon=채원, jbk=정병기.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 250,
      system: '너는 tripleS 멤버의 팬심에 맞는 댓글 생성기야. 주어진 게시글을 보고 멤버의 반응을 자연스럽게 선택해 JSON으로만 응답해.',
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API 오류 ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text?.trim() || '';
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

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  // 1. community-feed.json 읽기
  const feedPath = join(PROJECT_ROOT, 'public', 'community-feed.json');
  let feed;
  try {
    const raw = await readFile(feedPath, 'utf-8');
    feed = JSON.parse(raw);
  } catch (e) {
    console.error('❌ community-feed.json 읽기 실패:', e.message);
    process.exit(1);
  }

  const allItems = feed.items || [];
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
  for (const item of newItems) {
    const text = (item.title || '') + ' ' + (item.content || '');
    const taggedMembers = detectMemberTags(text);

    console.log(`\n📌 [${item.id}] "${item.title || item.content?.slice(0, 30)}"`);
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
