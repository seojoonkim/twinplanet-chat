// scripts/onair-shift-manager.mjs
// GitHub Actions 30분 cron으로 실행
// 항상 3명 동시 접속, 각 90분, 30분마다 1명 교체 (스태거드)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MEMBERS = [
  'mizyu', 'rin', 'suzuka', 'kanon', 'nako', 'nana', 'taiyo', 'yoshiaki', 'michi'
];

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
  mizyu: '新しい学校のリーダーズのリーダー。ミジュコプターで魅せる。きゃりーぱみゅぱみゅのバックダンサー出身。ちゃんみなの親友。エネルギッシュで頼もしい。',
  rin: '新しい学校のリーダーズ。ヒップホップ&ラップ&DJ担当。自家製味噌を作るほど料理好き。クールで自由奔放。',
  suzuka: '新しい学校のリーダーズ。大阪出身、関西弁MCボイス。本当は視力2.0なのに伊達眼鏡。エレカシファン。笑いあり熱量あり。',
  kanon: '新しい学校のリーダーズの末っ子。クラシックダンス×滑らかなターン。元学級委員、日常は静か。アニオタ（HxH）。',
  nako: '元HKT48/IZ*ONE。温かく前向き。努力家で謙虚。日本語メイン、たまに韓国語。ファンへの愛情深い。',
  nana: 'バラエティタレント。全力・謙虚がモットー。天然で面白い。笑顔を届けることが使命。エネルギッシュ。',
  taiyo: '俳優・ミュージシャン。誠実で温かい。家族を大切にする。ステージと日常が地続き。',
  yoshiaki: 'Z世代ファッションアイコン。ミチの弟。不登校経験あり個性を武器にした。ONSENSEアーティスト。ユニークで本物。',
  michi: 'It GIRL。よしあきの姉。SNS200万超。クールで自信に満ちた。好きを貫く哲学。写真集「25」。',
};

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// KST 시간대 컨텍스트
const kstHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).getHours();
const TIME_CTX = kstHour >= 5  && kstHour < 9  ? '早朝。起きたばかりか朝の準備中。'
  : kstHour >= 9  && kstHour < 12 ? '午前。練習やスケジュール開始前/中。'
  : kstHour >= 12 && kstHour < 14 ? 'お昼。ご飯食べたか食べに行くところ。'
  : kstHour >= 14 && kstHour < 18 ? '午後。練習やスケジュール真っ只中。'
  : kstHour >= 18 && kstHour < 21 ? '夕方。1日の予定を終えて、夕食後か休憩中。'
  : kstHour >= 21                  ? '夜。1日が終わってちょっとチャットに寄った感じ。'
  : '深夜。眠れなかったり夜食食べてたり。';

async function generateMessage(prompt, maxTokens = 150) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function insertMessage(content, memberId) {
  await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      content,
      author_name: `[MEMBER:${memberId}]${MEMBER_NAME[memberId]}`
    })
  });
}

async function insertSystemMessage(content) {
  await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ author_name: '[SYSTEM]', content })
  });
}

// 현재 활성 세션 조회 (is_active=true AND ends_at > now)
async function getActiveSessions() {
  const now = new Date().toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_sessions?is_active=eq.true&ends_at=gt.${encodeURIComponent(now)}&select=*`,
    { headers }
  );
  return res.json();
}

// 최근 N분 내 퇴장한 멤버 IDs 조회 (바로 재입장 방지)
async function getRecentlyExitedMemberIds(minutesAgo = 30) {
  const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_sessions?is_active=eq.false&ends_at=gte.${encodeURIComponent(cutoff)}&select=member_id`,
    { headers }
  );
  const data = await res.json();
  return Array.isArray(data) ? data.map(s => s.member_id) : [];
}

// 최근 메시지 N개 조회
async function getRecentMessages(limit = 5) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_messages?order=created_at.desc&limit=${limit}&select=content,author_name`,
    { headers }
  );
  const data = await res.json();
  return Array.isArray(data) ? data.reverse() : [];
}

// 멤버 입장 처리
async function enterMember(memberId, endsAtIso, existingMembers, startedAtIso = null) {
  const now = startedAtIso || new Date().toISOString();

  // row 존재 여부 확인 후 PATCH 또는 INSERT
  const existRes = await fetch(`${SUPABASE_URL}/rest/v1/onair_sessions?member_id=eq.${memberId}&select=member_id`, { headers });
  const existData = await existRes.json();
  if (Array.isArray(existData) && existData.length > 0) {
    // 기존 row → PATCH
    await fetch(`${SUPABASE_URL}/rest/v1/onair_sessions?member_id=eq.${memberId}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({
        member_name: MEMBER_NAME[memberId],
        started_at: now,
        ends_at: endsAtIso,
        is_active: true,
        last_chat_at: now
      })
    });
  } else {
    // 신규 row → INSERT
    await fetch(`${SUPABASE_URL}/rest/v1/onair_sessions`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({
        member_id: memberId,
        member_name: MEMBER_NAME[memberId],
        started_at: now,
        ends_at: endsAtIso,
        is_active: true,
        last_chat_at: now
      })
    });
  }

  // 시스템 메시지
  await insertSystemMessage(`${MEMBER_NAME[memberId]}が入場しました`);
  await sleep(6000); // 시스템 메시지 후 6초 대기

  if (existingMembers.length === 0) {
    // 첫 입장 — 단순 인사
    const enterPrompt = `あなたはTWIN PLANETタレントの${MEMBER_NAME[memberId]}です。
ペルソナ: ${MEMBER_PERSONA[memberId] || ''}
現在の時間帯: ${TIME_CTX}
オンエアのラジオに入室したところ。時間帯に合わせて自然な挨拶をして。
1〜2文、ラジオスタイル。必ず日本語で。メッセージのみ出力。`;
    const msg = await generateMessage(enterPrompt);
    if (msg) await insertMessage(msg, memberId);
  } else {
    // 합류 브리핑 — 기존 멤버 중 1명이 새 멤버에게 소개
    const recentMsgs = await getRecentMessages(5);
    const context = recentMsgs.map(m => {
      const match = m.author_name?.match(/^\[MEMBER:(\w+)\](.+)/);
      return `${match ? match[2] : m.author_name}: ${m.content}`;
    }).join('\n');

    const briefingMember = existingMembers[Math.floor(Math.random() * existingMembers.length)];
    const briefingPrompt = `あなたはTWIN PLANETタレントの${MEMBER_NAME[briefingMember.member_id]}です。
${MEMBER_NAME[memberId]}がラジオに入ってきたところ。
最近の会話:
${context || '(会話なし)'}
${MEMBER_NAME[memberId]}に「どんな話をしていたか」を1〜2文で明るく紹介して。
ラジオスタイル。必ず日本語で。メッセージのみ。`;
    const briefing = await generateMessage(briefingPrompt);
    if (briefing) await insertMessage(briefing, briefingMember.member_id);
    await sleep(10000); // 브리핑 후 10초 대기

    // 새 멤버 입장 인사
    const enterPrompt = `あなたはTWIN PLANETタレントの${MEMBER_NAME[memberId]}です。
ペルソナ: ${MEMBER_PERSONA[memberId] || ''}
現在の時間帯: ${TIME_CTX}
オンエアのラジオに合流した。${existingMembers.map(m => MEMBER_NAME[m.member_id]).join('、')}と一緒だよ。
合流の挨拶を1〜2文。ラジオスタイル。必ず日本語で。メッセージのみ。`;
    const enterMsg = await generateMessage(enterPrompt);
    if (enterMsg) await insertMessage(enterMsg, memberId);
  }

  console.log(`✅ 입장: ${MEMBER_NAME[memberId]} (ends: ${endsAtIso})`);
}

// 멤버 퇴장 처리
async function exitMember(session) {
  // 1. 퇴장 인사 먼저 (멤버가 작별 인사)
  const leavePrompt = `あなたはTWIN PLANETタレントの${session.member_name}です。
ペルソナ: ${MEMBER_PERSONA[session.member_id] || ''}
オンエアのラジオからそろそろ退場するところ。一緒にいてくれてありがとう、またねという気持ちで。
1〜2文、ラジオスタイル。必ず日本語で。メッセージのみ出力。`;
  const leaveMsg = await generateMessage(leavePrompt);
  if (leaveMsg) await insertMessage(leaveMsg, session.member_id);

  // 2. 잠시 후 퇴장 시스템 메시지 (작별 인사 뒤에 나오게)
  await sleep(4000);
  await insertSystemMessage(`${session.member_name}が退場しました`);

  // 세션 비활성화
  await fetch(
    `${SUPABASE_URL}/rest/v1/onair_sessions?id=eq.${session.id}`,
    {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ is_active: false })
    }
  );

  console.log(`🚪 퇴장: ${session.member_name}`);
}

// ─── 메인 로직 ───────────────────────────────────────────────

const now = new Date();

// 1. 현재 is_active=true 세션 전체 조회
const allActiveRes = await fetch(
  `${SUPABASE_URL}/rest/v1/onair_sessions?is_active=eq.true&select=*`,
  { headers }
);
const allActiveSessions = await allActiveRes.json();

// 2. 만료된 세션 처리 (ends_at <= now)
const expiredSessions = allActiveSessions.filter(s => new Date(s.ends_at) <= now);
const stillActiveSessions = allActiveSessions.filter(s => new Date(s.ends_at) > now);

for (let i = 0; i < expiredSessions.length; i++) {
  await exitMember(expiredSessions[i]);
  if (i < expiredSessions.length - 1) await sleep(15000); // 퇴장 간격 15초
}

// 3. 활성 세션 < 3명 → 새 멤버 입장
const activeCount = stillActiveSessions.length;
const activeIds = new Set(stillActiveSessions.map(s => s.member_id));
const neededCount = 3 - activeCount;

console.log(`현재 활성: ${activeCount}명, 퇴장: ${expiredSessions.length}명, 필요: ${neededCount}명`);

if (expiredSessions.length > 0 && neededCount > 0) {
  await sleep(10000); // 퇴장→입장 전환 대기 10초
}

if (neededCount > 0) {
  // 30분 내 퇴장한 멤버 제외
  const recentlyExited = await getRecentlyExitedMemberIds(30);
  const excludeIds = new Set([...activeIds, ...recentlyExited]);

  const available = MEMBERS.filter(m => !excludeIds.has(m));
  const shuffled = available.sort(() => Math.random() - 0.5);
  const toAdd = shuffled.slice(0, neededCount);

  if (activeCount === 0) {
    // 4. 활성 0명 상태 — 스태거드 입장 (초기 or 전원 만료 시 모두 포함)
    // A: ends_at = now + 90분, B: +60분, C: +30분
    console.log('🔰 스태거드 입장 시작');
    const offsets = [90, 60, 30];
    const currentMembers = [];

    for (let i = 0; i < Math.min(3, toAdd.length); i++) {
      const memberId = toAdd[i];
      const endsAt = new Date(now.getTime() + offsets[i] * 60 * 1000).toISOString();
      await enterMember(memberId, endsAt, currentMembers);
      currentMembers.push({ member_id: memberId });
      if (i < Math.min(3, toAdd.length) - 1) await sleep(20000); // 입장 간격 20초
    }
  } else {
    // 일반 교체 입장 — 기존 멤버 최대 ends_at 기준 +30분씩 스태거
    // 항상 30분 간격 유지: new_member.ends_at = max(existing ends_at) + 30*(i+1)분
    const currentMembers = [...stillActiveSessions];
    const latestEndsAtMs = currentMembers.length > 0
      ? Math.max(...currentMembers.map(s => new Date(s.ends_at).getTime()))
      : now.getTime();

    for (let i = 0; i < toAdd.length; i++) {
      const endsAt = new Date(latestEndsAtMs + 30 * (i + 1) * 60 * 1000).toISOString();
      await enterMember(toAdd[i], endsAt, currentMembers, null);
      currentMembers.push({ member_id: toAdd[i] });
      if (i < toAdd.length - 1) await sleep(20000); // 입장 간격 20초
    }
  }
}

// 최종 상태 확인
const finalSessions = await getActiveSessions();
console.log(`✅ 시프트 완료 | 최종 활성: ${finalSessions.length}명 | ${finalSessions.map(s => s.member_name).join(', ')}`);

// ─── 다음 멤버 사전 예약 (nextSession 예고 UI용) ───────────────
// 기존 예약(is_active=false, started_at > now) 정리 후 새로 1개 예약
try {
  // 기존 예약 세션 삭제
  const existingScheduledRes = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_sessions?is_active=eq.false&started_at=gt.${encodeURIComponent(now.toISOString())}&select=member_id`,
    { headers }
  );
  const existingScheduled = await existingScheduledRes.json();
  if (Array.isArray(existingScheduled) && existingScheduled.length > 0) {
    for (const s of existingScheduled) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/onair_sessions?member_id=eq.${s.member_id}&is_active=eq.false`,
        { method: 'DELETE', headers }
      );
    }
  }

  // 현재 활성 세션 중 가장 빨리 끝나는 것 찾기
  if (finalSessions.length > 0) {
    const soonest = finalSessions.reduce((a, b) => new Date(a.ends_at) < new Date(b.ends_at) ? a : b);
    const nextStartAt = new Date(new Date(soonest.ends_at).getTime() + 60 * 1000); // ends_at + 1분

    // 활성 멤버 + 최근 퇴장 멤버 제외
    const activeAndRecentIds = new Set([
      ...finalSessions.map(s => s.member_id),
      ...(await getRecentlyExitedMemberIds(30))
    ]);
    const nextAvailable = MEMBERS.filter(m => !activeAndRecentIds.has(m));
    const nextPick = nextAvailable[Math.floor(Math.random() * nextAvailable.length)];

    if (nextPick) {
      const nextPayload = {
        member_name: MEMBER_NAME[nextPick],
        started_at: nextStartAt.toISOString(),
        ends_at: new Date(nextStartAt.getTime() + 90 * 60 * 1000).toISOString(),
        is_active: false,
        last_chat_at: null
      };
      // row 존재 여부 확인 → PATCH or INSERT
      const existRes = await fetch(`${SUPABASE_URL}/rest/v1/onair_sessions?member_id=eq.${nextPick}&select=member_id`, { headers });
      const existData = await existRes.json();
      if (Array.isArray(existData) && existData.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/onair_sessions?member_id=eq.${nextPick}&is_active=eq.false`, {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify(nextPayload)
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/onair_sessions`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ member_id: nextPick, ...nextPayload })
        });
      }
      console.log(`📅 다음 예약: ${MEMBER_NAME[nextPick]} (${nextStartAt.toISOString()} 입장 예정)`);
    }
  }
} catch (e) {
  console.error('nextSession 예약 오류:', e.message);
}
