// api/onair-member-greet.js
// 새 멤버 온에어 입장 시 인사 + 오늘 뭐했는지 자동 메시지 생성

const MEMBER_PERSONA = {
  seoyeon: '따뜻하고 언니같은 리더. 다정하고 배려심 깊은 말투.',
  hyerin: '에너지 넘치고 귀여운. 리액션 왕. 이모티콘 많이 사용.',
  jiwoo: '신비롭고 조용함. 짧고 임팩트 있는 말투.',
  chaeyeon: '밝고 활발함. "진짜ㅋㅋ" "맞아요!" 자주 씀.',
  yooyeon: '성숙하고 감성적. 차분한 말투.',
  sumin: '귀엽고 털털함. 웃음이 많음. 솔직함.',
  naekyung: '씩씩하고 에너지 넘침. 직설적이고 솔직함.',
  yubin: '세련되고 카리스마 있음. 쿨한 척하지만 팬들에게 약함.',
  kaede: '일본에서 온 멤버. 한국어 열심히 배우는 중.',
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
  sion: '차분하고 성숙함. 깊이 있는 말 자주 함.',
  chaewon: '완벽주의. 꼼꼼하고 성실함.',
  seollin: '자유분방함. 창의적인 발상.',
  seoa: '다정하고 공감능력 높음.',
  jiyeon: '감수성 풍부. 예술적인 표현 좋아함.'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { memberId, memberName, event = 'join' } = req.body ?? {};
  if (!memberId || !memberName) return res.status(400).json({ error: 'memberId, memberName required' });

  const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? '').trim();
  const SUPABASE_ANON_KEY = (process.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  const persona = MEMBER_PERSONA[memberId] ?? '밝고 친근한 멤버.';

  // KST 시간대 컨텍스트
  const kstHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).getHours();
  const timeCtx = kstHour >= 5 && kstHour < 9   ? '이른 아침 (출근/등교 전). 막 일어났거나 아침 준비 중.'
    : kstHour >= 9  && kstHour < 12  ? '오전. 연습이나 스케줄 시작 전/중.'
    : kstHour >= 12 && kstHour < 14  ? '점심 시간. 밥 먹었거나 먹으러 갈 참.'
    : kstHour >= 14 && kstHour < 18  ? '오후. 연습이나 스케줄 한창.'
    : kstHour >= 18 && kstHour < 21  ? '저녁. 하루 일정 마무리, 저녁 먹었거나 쉬는 중.'
    : kstHour >= 21 && kstHour < 24  ? '밤. 하루 끝나고 잠깐 채팅방 들린 느낌.'
    : '새벽. 잠 못 자고 있거나 야식 먹는 중.';

  const promptContent = event === 'leave'
    ? `너는 tripleS 멤버 ${memberName}이야. 페르소나: ${persona}\n현재 시간대: ${timeCtx}\n온에어 팬 채팅방을 떠나면서 자연스러운 작별 인사를 해줘. 시간대에 맞게 (예: 밤이면 "오늘 하루도 수고했어요~", 낮이면 "잠깐 들렀다 가요!") 표현하고, 다음에 또 만나자는 느낌으로. 1~2문장. 한국어. 진짜 채팅처럼. 메시지만 출력.`
    : `너는 tripleS 멤버 ${memberName}이야. 페르소나: ${persona}\n현재 시간대: ${timeCtx}\n방금 온에어 팬 채팅방에 입장했어. 시간대에 맞는 자연스러운 인사를 해줘 (예: 점심이면 점심 관련, 밤이면 밤 분위기). 억지로 "연습 끝나고" 같은 말 쓰지 말고 시간에 맞게. 2~3문장. 한국어. 진짜 채팅처럼. 메시지만 출력.`;

  const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      max_tokens: 150,
      messages: [{ role: 'user', content: promptContent }]
    })
  });

  const aiData = await aiRes.json();
  const content = aiData.choices?.[0]?.message?.content?.trim();
  if (!content) return res.status(200).json({ skipped: 'empty' });

  await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

  const sbHeaders = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({
      content,
      author_name: `[MEMBER:${memberId}]${memberName}`
    })
  });

  return res.status(200).json({ ok: true, member: memberName });
}
