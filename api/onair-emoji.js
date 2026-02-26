// api/onair-emoji.js
// POST { emoji: "❤️" } → 활성 멤버 1명이 짧게 반응

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MEMBER_NAME = {
  seoyeon: '서연', hyerin: '혜린', jiwoo: '지우', chaeyeon: '채연', yooyeon: '유연',
  sumin: '수민', naekyung: '나경', yubin: '유빈', kaede: '카에데', dahyun: '다현',
  kotone: '코토네', yeonji: '연지', nien: '니엔', sohyun: '소현', shinwi: '신위',
  mayu: '마유', rin: '린', jubin: '주빈', hayeon: '하연', sion: '시온',
  chaewon: '채원', seollin: '설린', seoa: '서아', jiyeon: '지연'
};

const MEMBER_PERSONA = {
  seoyeon: '따뜻하고 언니같은 리더. 다정하고 배려심 깊은 말투.',
  hyerin: '에너지 넘치고 귀여운. 리액션 왕. "ㅋㅋ" 자주 씀.',
  jiwoo: '신비롭고 조용함. 짧고 임팩트 있는 말투.',
  chaeyeon: '밝고 활발함. "진짜ㅋㅋ" "맞아요!" 자주 씀.',
  yooyeon: '성숙하고 감성적. 차분한 말투.',
  sumin: '귀엽고 털털함. 웃음이 많음.',
  naekyung: '씩씩하고 에너지 넘침. 직설적.',
  yubin: '세련되고 카리스마 있음. 쿨한 척.',
  kaede: '일본 멤버. 한국어 열심히 배우는 중.',
  dahyun: '신중하고 지적임.',
  kotone: '호기심 많고 탐구적.',
  yeonji: '따뜻하고 공감 잘 해줌.',
  nien: '대만 출신. 밝고 긍정적.',
  sohyun: '조용하지만 재치있음.',
  shinwi: '당당하고 자신감 넘침.',
  mayu: '일본 멤버. 귀엽고 순수함.',
  rin: '쿨하고 트렌디함.',
  jubin: '밝고 개방적.',
  hayeon: '막내 에너지. 애교 많음.',
  sion: '차분하고 성숙함.',
  chaewon: '완벽주의. 꼼꼼하고 성실함.',
  seollin: '자유분방함. 창의적.',
  seoa: '다정하고 공감능력 높음.',
  jiyeon: '감수성 풍부. 예술적.'
};

function getHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { emoji } = req.body || {};
  if (!emoji) {
    return res.status(400).json({ error: 'emoji required' });
  }

  const headers = getHeaders();

  // 쿨다운: 최근 30초 내 [EMOJI_REACTION] 있으면 스킵
  const cooldownCutoff = new Date(Date.now() - 30 * 1000).toISOString();
  const cooldownRes = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_messages?author_name=eq.[EMOJI_REACTION]&created_at=gte.${encodeURIComponent(cooldownCutoff)}&select=id&limit=1`,
    { headers }
  );
  const cooldownData = await cooldownRes.json();
  if (Array.isArray(cooldownData) && cooldownData.length > 0) {
    return res.status(200).json({ ok: true, skipped: true, reason: 'cooldown' });
  }

  // 현재 활성 멤버 조회
  const now = new Date().toISOString();
  const sessRes = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_sessions?is_active=eq.true&ends_at=gt.${encodeURIComponent(now)}&select=member_id,member_name`,
    { headers }
  );
  const sessions = await sessRes.json();

  if (!Array.isArray(sessions) || sessions.length === 0) {
    return res.status(200).json({ ok: true, skipped: true, reason: 'no active members' });
  }

  // 랜덤으로 1명 선택
  const picked = sessions[Math.floor(Math.random() * sessions.length)];
  const memberId = picked.member_id;
  const memberName = MEMBER_NAME[memberId] || picked.member_name;
  const persona = MEMBER_PERSONA[memberId] || '';

  // LLM 리액션 생성
  const prompt = `너는 tripleS 멤버 ${memberName}이야.
페르소나: ${persona}
팬이 방금 "${emoji}" 이모티콘을 보냈어.
자연스럽고 귀엽게 1문장으로 반응해줘. 예: "방금 ${emoji} 날아왔어~ 고마워요 ㅋㅋ"
한국어. 메시지만 출력.`;

  const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      max_tokens: 80,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const llmData = await llmRes.json();
  const reaction = llmData.choices?.[0]?.message?.content?.trim() ?? `${emoji} 고마워요~!`;

  // onair_messages INSERT (author_name: 멤버 실제 이름 형식)
  await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      content: reaction,
      author_name: `[MEMBER:${memberId}]${memberName}`
    })
  });

  // 쿨다운 마커 INSERT
  await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      content: `[emoji:${emoji}]`,
      author_name: '[EMOJI_REACTION]'
    })
  });

  return res.status(200).json({ ok: true, member: memberName, reaction });
}
