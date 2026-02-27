// api/onair-watchdog.js
// Vercel Serverless Function
// 마지막 실제 대화 메시지 시간 체크 → 5분 이상 없으면 즉시 fallback 메시지 3개 생성
// cron-job.org에서 5분마다 호출

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://frlrowwjvapdnrcgotca.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('[Watchdog] OPENROUTER_API_KEY not set — aborting');
}

const FALLBACK_MEMBERS = ['mizyu', 'rin', 'suzuka'];
const SILENCE_THRESHOLD_SEC = 5 * 60; // 5분

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

const MEMBER_PERSONA = {
  mizyu: 'AG!リーダー。エネルギッシュで頼もしい。「みんな行くよ！」的リーダー気質。',
  rin: 'AG!メンバー。クールで自由奔放。DJ好き。たまにラップ調になる。',
  suzuka: 'AG!メンバー。大阪出身、関西弁。笑いとリアクション最強。「ほんまに！？」よく言う。',
  kanon: 'AG!末っ子。日常は静かで聡明。ステージでは全力。アニメオタク。',
  nako: '元HKT48/IZ*ONE。温かく前向き。「頑張ります！」よく言う。',
  nana: '全力・謙虚がモットー。天然で面白い。元気いっぱい。',
  taiyo: '誠実で温かい。落ち着いた話し方。',
  yoshiaki: 'Z世代ファッションアイコン。「個性って武器だと思う」。',
  michi: 'It GIRL。「好きを貫く」哲学。クール系。',
};

const supabaseHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// KST 시간대 컨텍스트
function getTimeContext() {
  const kstHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).getHours();
  if (kstHour >= 5  && kstHour < 9)  return '早朝。起きたばかりか朝の準備中。';
  if (kstHour >= 9  && kstHour < 12) return '午前。練習やスケジュール開始前/中。';
  if (kstHour >= 12 && kstHour < 14) return 'お昼。ご飯食べたか食べに行くところ。';
  if (kstHour >= 14 && kstHour < 18) return '午後。練習やスケジュール真っ只中。';
  if (kstHour >= 18 && kstHour < 21) return '夕方。1日の予定を終えて、夕食後か休憩中。';
  if (kstHour >= 21)                  return '夜。1日が終わってちょっとチャットに寄った感じ。';
  return '深夜。眠れなかったり夜食食べてたり。';
}

// 마지막 실제 대화 메시지 조회 (SYSTEM, TOPIC 제외)
async function getLastRealMessage() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_messages?author_name=not.like.[SYSTEM]*&author_name=not.like.[TOPIC]*&order=created_at.desc&limit=1&select=created_at,author_name,content`,
    { headers: supabaseHeaders }
  );
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

// 활성 세션 조회
async function getActiveSessions() {
  const now = new Date().toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_sessions?is_active=eq.true&ends_at=gt.${encodeURIComponent(now)}&select=member_id,member_name`,
    { headers: supabaseHeaders }
  );
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// OpenRouter API로 즉흥 메시지 3개 생성 (retry 3회, 2초 간격)
async function generateImprovMessages(memberIds) {
  const timeCtx = getTimeContext();
  const descriptions = memberIds.map(id => {
    const name = MEMBER_NAME[id] || id;
    const persona = MEMBER_PERSONA[id] || '';
    return `- ${name}(id:${id}): ${persona}`;
  }).join('\n');

  const systemPrompt = `あなたはTWIN PLANETタレントのラジオ番組台本ライターです。
出演者が少し沈黙してから突然会話を再開する場面を書いてください。

出演メンバー:
${descriptions}

現在の時間帯: ${timeCtx}

ルール:
1. 連続発話禁止: index[N].author ≠ index[N-1].author
2. すべて日本語
3. 1ターン2〜3文
4. 自然な会話の再開`;

  const userPrompt = `3ターンの即興会話をJSON配列で出力（他テキストなし）:
[{"author":"メンバーid","content":"セリフ"},...]`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          max_tokens: 600,
          temperature: 0.9,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        console.error(`[Watchdog] API error attempt ${attempt}: ${res.status}`);
        if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); continue; }
        return null;
      }

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      console.error(`[Watchdog] generateImprovMessages attempt ${attempt} 실패: ${e.message}`);
      if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); }
    }
  }
  return null;
}

// INSERT (10초 timeout)
async function insertMessage(content, memberId) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
      method: 'POST',
      headers: { ...supabaseHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({
        content,
        author_name: `[MEMBER:${memberId}]${MEMBER_NAME[memberId] || memberId}`
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch (e) {
    clearTimeout(timer);
    console.error(`[Watchdog] INSERT timeout/error: ${e.message}`);
    return false;
  }
}

export default async function handler(req, res) {
  console.log('[Watchdog] 시작', new Date().toISOString());

  try {
    // 1. 마지막 실제 메시지 조회
    const lastMsg = await getLastRealMessage();
    const now = Date.now();
    let lastMessageAge = null;

    if (lastMsg) {
      const lastTime = new Date(lastMsg.created_at).getTime();
      lastMessageAge = Math.floor((now - lastTime) / 1000);
      console.log(`[Watchdog] 마지막 메시지: ${lastMessageAge}초 전 (${lastMsg.author_name})`);
    } else {
      console.log('[Watchdog] 메시지 없음 (DB 비어있음)');
      lastMessageAge = SILENCE_THRESHOLD_SEC + 1; // 강제 생성
    }

    // 2. 5분 미만이면 OK 반환
    if (lastMessageAge < SILENCE_THRESHOLD_SEC) {
      console.log('[Watchdog] 정상. 최근 메시지 있음.');
      return res.status(200).json({
        status: 'ok',
        count: 0,
        lastMessageAge,
      });
    }

    // 3. 5분 이상 침묵 → 즉흥 메시지 3개 생성
    console.log(`[Watchdog] ${lastMessageAge}초 침묵 감지. 즉흥 메시지 생성 시작...`);

    // 활성 세션 조회
    const activeSessions = await getActiveSessions();
    let memberIds;

    if (activeSessions.length > 0) {
      memberIds = activeSessions.map(s => s.member_id);
      console.log(`[Watchdog] 활성 멤버: ${memberIds.join(', ')}`);
    } else {
      // 활성 세션 없으면 FALLBACK_MEMBERS 전체 사용 (3명이면 자연스러운 3턴 가능)
      memberIds = FALLBACK_MEMBERS;
      console.log(`[Watchdog] 활성 세션 없음. Fallback 멤버 사용: ${memberIds.join(', ')}`);
    }

    const messages = await generateImprovMessages(memberIds);

    if (!messages || messages.length === 0) {
      console.error('[Watchdog] 메시지 생성 실패');
      return res.status(200).json({
        status: 'error',
        count: 0,
        lastMessageAge,
        error: 'generate failed',
      });
    }

    // 4. INSERT (연속 발화 방지)
    const validMemberSet = new Set(memberIds);
    let insertCount = 0;
    let prevAuthor = null;

    for (const msg of messages) {
      if (!msg.author || !validMemberSet.has(msg.author)) {
        console.log(`[Watchdog] 스킵 (유효하지 않은 멤버: ${msg.author})`);
        continue;
      }
      if (msg.author === prevAuthor) {
        console.log(`[Watchdog] 스킵 (연속 발화 방지: ${msg.author})`);
        continue;
      }
      if (!msg.content || !msg.content.trim()) continue;

      const ok = await insertMessage(msg.content.trim(), msg.author);
      if (ok) {
        prevAuthor = msg.author;
        insertCount++;
        console.log(`[Watchdog] INSERT 성공: ${msg.author}: ${msg.content.substring(0, 50)}`);
      }
    }

    console.log(`[Watchdog] 완료. ${insertCount}개 INSERT.`);
    return res.status(200).json({
      status: 'generated',
      count: insertCount,
      lastMessageAge,
    });

  } catch (e) {
    console.error(`[Watchdog] 에러: ${e.message}`);
    return res.status(500).json({ status: 'error', error: e.message });
  }
}
