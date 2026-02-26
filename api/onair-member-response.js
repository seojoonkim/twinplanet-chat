// api/onair-member-response.js
// 유저가 메시지 전송 시 프론트에서 호출 — 접속 중인 멤버가 실시간 응답

const MEMBER_PERSONA = {
  seoyeon: '따뜻하고 언니같은 리더. 다정하고 배려심 깊은 말투. 팬들을 "여러분"이라 부름.',
  hyerin: '에너지 넘치고 귀여운. 리액션 왕. "ㅋㅋ" 자주 씀. 이모티콘 많이 사용.',
  jiwoo: '신비롭고 조용함. 짧고 임팩트 있는 말투. 시적인 표현.',
  chaeyeon: '밝고 활발함. "진짜ㅋㅋ" "맞아요!" 자주 씀.',
  yooyeon: '성숙하고 감성적. 차분한 말투.',
  sumin: '귀엽고 털털함. 웃음이 많음. 솔직함.',
  naekyung: '씩씩하고 에너지 넘침. 직설적이고 솔직함.',
  yubin: '세련되고 카리스마 있음. 쿨한 척하지만 팬들에게 약함.',
  kaede: '일본에서 온 멤버. 한국어 열심히 배우는 중. 가끔 어색한 표현.',
  dahyun: '신중하고 지적임. 분석적인 발언 자주 함.',
  kotone: '호기심 많고 탐구적. "왜 그럴까요?" 자주 씀.',
  yeonji: '따뜻하고 공감 잘 해줌. "맞아요 진짜" 자주 씀.',
  nien: '대만 출신. 밝고 긍정적. 팬들에게 응원 많이 함.',
  sohyun: '조용하지만 재치있음. 타이밍 좋은 한마디.',
  shinwi: '당당하고 자신감 넘침. 리더십 있음.',
  mayu: '일본 멤버. 귀엽고 순수함. 놀라는 반응 잘 함.',
  rin: '쿨하고 트렌디함. 짧은 대답 선호.',
  jubin: '밝고 개방적. 새로운 것 좋아함.',
  hayeon: '막내 에너지. 애교 많음. 웃음 많음.',
  sion: '차분하고 성숙함. 깊이 있는 말 자주 함.',
  chaewon: '완벽주의. 꼼꼼하고 성실함.',
  seollin: '자유분방함. 창의적인 발상.',
  seoa: '다정하고 공감능력 높음.',
  jiyeon: '감수성 풍부. 예술적인 표현 좋아함.'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userMessage, userNickname } = req.body ?? {};
  if (!userMessage) return res.status(400).json({ error: 'userMessage required' });

  const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? '').trim();
  const SUPABASE_ANON_KEY = (process.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  const sbHeaders = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  // 1. 현재 활성 세션 조회 (ends_at > now)
  const sessRes = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_sessions?is_active=eq.true&ends_at=gt.${encodeURIComponent(new Date().toISOString())}&select=*`,
    { headers: sbHeaders }
  );
  const activeSessions = await sessRes.json();

  if (!Array.isArray(activeSessions) || activeSessions.length === 0) {
    return res.status(200).json({ skipped: 'no_active_members' });
  }

  // 2. 최근 AI 메시지 확인 — 7초 이내 중복 응답 방지
  const recentRes = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_messages?order=created_at.desc&limit=1`,
    { headers: sbHeaders }
  );
  const [lastMsg] = await recentRes.json();
  const isAiMsg = lastMsg?.author_name?.startsWith('[MEMBER:');
  if (isAiMsg && Date.now() - new Date(lastMsg.created_at).getTime() < 7000) {
    return res.status(200).json({ skipped: 'cooldown' });
  }

  // 3. 응답할 멤버 선택 (만료된 세션 이중 필터 + 마지막 응답 멤버 제외, 랜덤)
  const nowMs = Date.now();
  const validSessions = activeSessions.filter(s => new Date(s.ends_at).getTime() > nowMs);
  if (validSessions.length === 0) {
    return res.status(200).json({ skipped: 'all_sessions_expired' });
  }
  const lastMemberId = lastMsg?.author_name?.match(/^\[MEMBER:(\w+)\]/)?.[1];
  const available = validSessions.filter(s => s.member_id !== lastMemberId);
  const session = available[Math.floor(Math.random() * available.length)] ?? validSessions[0];

  if (!session?.member_id || !session?.member_name) {
    return res.status(200).json({ skipped: 'invalid_session_data' });
  }

  // 4. 최근 대화 10개 컨텍스트
  const ctxRes = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_messages?order=created_at.desc&limit=10`,
    { headers: sbHeaders }
  );
  const recentMsgs = (await ctxRes.json()).reverse();
  const context = recentMsgs.map(m => {
    const match = m.author_name?.match(/^\[MEMBER:(\w+)\](.+)/);
    return `${match ? match[2] : m.author_name}: ${m.content}`;
  }).join('\n');

  // 5. gpt-4o-mini 응답 생성
  const persona = MEMBER_PERSONA[session.member_id] ?? '';
  const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `너는 tripleS 멤버 ${session.member_name}이야. 페르소나: ${persona}
팬 "${userNickname ?? '팬'}"이 방금 말했어: "${userMessage}"
최근 대화:
${context || '(대화 없음)'}
자연스럽게 답해줘. 1~2문장, 진짜 채팅처럼. 한국어. 팬 이름을 꼭 부를 필요는 없어. 메시지만 출력.`
      }]
    })
  });

  const aiData = await aiRes.json();
  const content = aiData.choices?.[0]?.message?.content?.trim();
  if (!content) return res.status(200).json({ skipped: 'empty_response' });

  // 6. 1~3초 랜덤 딜레이 (자연스러운 타이핑 느낌)
  await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

  // 7. onair_messages INSERT (return=representation으로 실제 DB row 반환)
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({
      content,
      author_name: `[MEMBER:${session.member_id}]${session.member_name}`
    })
  });
  const [insertedMsg] = await insertRes.json();

  // 8. last_chat_at 업데이트
  await fetch(
    `${SUPABASE_URL}/rest/v1/onair_sessions?id=eq.${session.id}`,
    {
      method: 'PATCH',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ last_chat_at: new Date().toISOString() })
    }
  );

  return res.status(200).json({
    ok: true,
    member: session.member_name,
    memberId: session.member_id,
    content,
    msgId: insertedMsg?.id ?? null,
    createdAt: insertedMsg?.created_at ?? new Date().toISOString(),
  });
}
