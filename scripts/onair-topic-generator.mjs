#!/usr/bin/env node
/**
 * onair-topic-generator.mjs
 * 5분마다 실행: 최근 대화를 분석해 주제를 생성하고 onair_messages에 저장
 */

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? '').trim();
const OPENROUTER_API_KEY = (process.env.OPENROUTER_API_KEY ?? '').trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !OPENROUTER_API_KEY) {
  console.error('Missing required env vars: SUPABASE_URL, SUPABASE_ANON_KEY, OPENROUTER_API_KEY');
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function fetchActiveSessions() {
  const nowIso = encodeURIComponent(new Date().toISOString());
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_sessions?is_active=eq.true&ends_at=gt.${nowIso}&select=member_name`,
    { headers }
  );
  if (!res.ok) return [];
  return await res.json();
}

async function fetchRecentMessages() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_messages?order=created_at.desc&limit=10&select=author_name,content`,
    { headers }
  );
  if (!res.ok) return [];
  const data = await res.json();
  // [TOPIC], [EMOJI_REACTION], [SYSTEM] 제외
  return data.filter(
    (m) => m.author_name !== '[TOPIC]' && m.author_name !== '[EMOJI_REACTION]' && m.author_name !== '[SYSTEM]'
  );
}

function getTimeBasedTopic() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 9) return '아침 루틴';
  if (hour >= 9 && hour < 12) return '오전 연습';
  if (hour >= 12 && hour < 14) return '점심 메뉴';
  if (hour >= 14 && hour < 17) return '오후 일정';
  if (hour >= 17 && hour < 19) return '저녁 계획';
  if (hour >= 19 && hour < 22) return '오늘 하루';
  return '밤의 이야기';
}

async function generateTopic(sessions, messages) {
  const memberNames = sessions.map((s) => s.member_name).join(', ') || '멤버';

  let prompt;
  if (messages.length === 0) {
    const timeTopic = getTimeBasedTopic();
    prompt = `tripleS 멤버(${memberNames})가 온에어 채팅 중입니다. 지금 시각 기반 주제: "${timeTopic}". 이 맥락에서 대화 주제 한 줄을 8자 이내 한국어로 생성해주세요. 예: "오늘 점심 메뉴", "연습 스케줄", "최근 드라마". 주제만 출력하고 따옴표나 부연 설명 없이 답하세요.`;
  } else {
    const msgText = messages
      .map((m) => `${m.author_name}: ${m.content}`)
      .reverse()
      .join('\n');
    prompt = `다음은 tripleS 멤버(${memberNames})의 최근 채팅 내용입니다:\n\n${msgText}\n\n이 대화의 주제를 8자 이내 한국어 한 줄로 요약해주세요. 예: "오늘 점심 메뉴", "연습 스케줄", "최근 드라마", "음악 추천". 주제만 출력하고 따옴표나 부연 설명 없이 답하세요.`;
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 30,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('OpenRouter error:', err);
    return getTimeBasedTopic();
  }

  const data = await res.json();
  let topic = data?.choices?.[0]?.message?.content?.trim() ?? '';
  // 따옴표 제거
  topic = topic.replace(/^["'"']|["'"']$/g, '').trim();
  // 8자 초과 시 자르기
  if (topic.length > 10) topic = topic.slice(0, 8);
  return topic || getTimeBasedTopic();
}

async function insertTopic(topic) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      author_name: '[TOPIC]',
      content: topic,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Insert failed:', err);
    return false;
  }
  return true;
}

async function main() {
  console.log('[onair-topic-generator] Starting...');

  const [sessions, messages] = await Promise.all([
    fetchActiveSessions(),
    fetchRecentMessages(),
  ]);

  console.log(`Active sessions: ${sessions.length}, Recent messages: ${messages.length}`);

  const topic = await generateTopic(sessions, messages);
  console.log(`Generated topic: "${topic}"`);

  const ok = await insertTopic(topic);
  if (ok) {
    console.log('[onair-topic-generator] Topic inserted successfully.');
  } else {
    console.error('[onair-topic-generator] Failed to insert topic.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
