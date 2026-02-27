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
    `${SUPABASE_URL}/rest/v1/onair_messages?order=created_at.desc&limit=100&select=author_name,content,created_at`,
    { headers }
  );
  if (!res.ok) return [];
  return await res.json();
}

// 마지막 [TOPIC] 이후 메시지 수 확인
// 최소 40개 메시지 + 30분 경과 후에만 새 주제 생성
async function shouldGenerateTopic() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_messages?order=created_at.desc&limit=200&select=author_name,created_at`,
    { headers }
  );
  if (!res.ok) return true; // 에러 시 일단 생성

  const msgs = await res.json();
  
  // 마지막 [TOPIC] 메시지 찾기
  const lastTopicIdx = msgs.findIndex(m => m.author_name === '[TOPIC]');
  
  if (lastTopicIdx === -1) return true; // 주제 없으면 생성
  
  const lastTopicMsg = msgs[lastTopicIdx];
  const lastTopicTime = new Date(lastTopicMsg.created_at);
  const minutesSinceLastTopic = (Date.now() - lastTopicTime.getTime()) / 60000;
  
  // 마지막 주제 이후 실제 대화 메시지 수
  const msgsSinceLastTopic = msgs.slice(0, lastTopicIdx).filter(
    m => m.author_name !== '[TOPIC]' && m.author_name !== '[EMOJI_REACTION]' && m.author_name !== '[SYSTEM]'
  ).length;
  
  console.log(`[topic-gen] 마지막 주제로부터 ${minutesSinceLastTopic.toFixed(1)}분, ${msgsSinceLastTopic}개 메시지`);
  
  // 최소 40개 메시지 AND 30분 경과
  if (msgsSinceLastTopic < 40) {
    console.log(`[topic-gen] 스킵: 메시지 부족 (${msgsSinceLastTopic}/40)`);
    return false;
  }
  if (minutesSinceLastTopic < 30) {
    console.log(`[topic-gen] 스킵: 시간 부족 (${minutesSinceLastTopic.toFixed(1)}/30분)`);
    return false;
  }
  
  return true;
}

function getTimeBasedTopic() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 9) return '朝のルーティン';
  if (hour >= 9 && hour < 12) return '午前の練習';
  if (hour >= 12 && hour < 14) return 'ランチメニュー';
  if (hour >= 14 && hour < 17) return '午後のスケジュール';
  if (hour >= 17 && hour < 19) return '夕方の計画';
  if (hour >= 19 && hour < 22) return '今日一日';
  return '夜の話';
}

async function generateTopic(sessions, messages) {
  const memberNames = sessions.map((s) => s.member_name).join(', ') || '멤버';

  let prompt;
  if (messages.length === 0) {
    const timeTopic = getTimeBasedTopic();
    prompt = `TWIN PLANETタレント(${memberNames})がオンエアチャット中です。現在の時間帯に基づくトピック: "${timeTopic}"。このコンテキストで会話テーマを10文字以内の日本語で1行生成してください。例: "今日のランチ", "練習スケジュール", "最近のドラマ"。テーマのみを出力し、引用符や補足説明なしで答えてください。`;
  } else {
    const msgText = messages
      .map((m) => `${m.author_name}: ${m.content}`)
      .reverse()
      .join('\n');
    prompt = `以下はTWIN PLANETタレント(${memberNames})の最近のチャット内容です:\n\n${msgText}\n\nこの会話のテーマを10文字以内の日本語1行で要約してください。例: "今日のランチ", "練習スケジュール", "最近のドラマ", "音楽のおすすめ"。テーマのみを出力し、引用符や補足説明なしで答えてください。`;
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
  // 引用符を除去
  topic = topic.replace(/^["'"']|["'"']$/g, '').trim();
  // 10文字超過時に切り取り
  if (topic.length > 12) topic = topic.slice(0, 10);
  return topic || getTimeBasedTopic();
}

async function insertTopic(topic) {
  // 1) [TOPIC] 메시지 (헤더 currentTopic용)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ author_name: '[TOPIC]', content: topic }),
  });
  if (!res.ok) {
    console.error('Insert [TOPIC] failed:', await res.text());
    return false;
  }

  return true;
}

async function main() {
  console.log('[onair-topic-generator] Starting...');

  // 40개 메시지 + 30분 경과 조건 확인
  const should = await shouldGenerateTopic();
  if (!should) {
    console.log('[onair-topic-generator] 조건 미달 — 주제 생성 스킵');
    process.exit(0);
  }

  const [sessions, allMessages] = await Promise.all([
    fetchActiveSessions(),
    fetchRecentMessages(),
  ]);

  // [TOPIC]/[SYSTEM]/[EMOJI_REACTION] 제외한 실제 대화 메시지만
  const messages = allMessages.filter(
    (m) => m.author_name !== '[TOPIC]' && m.author_name !== '[EMOJI_REACTION]' && m.author_name !== '[SYSTEM]'
  );

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
