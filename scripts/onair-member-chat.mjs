// scripts/onair-member-chat.mjs
// GitHub Actions에서 3분마다 실행됨
// 75% 확률로 실행 (더 자주)
// 같은 멤버 연속 2번 안됨
// 최근 메시지 맥락 파악 후 AI 응답

import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// 75% 확률로 실행 (3분 간격 → 더 자주)
if (Math.random() > 0.75) {
  console.log('Skip this run (random interval)');
  process.exit(0);
}

const MEMBERS = [
  'seoyeon','hyerin','jiwoo','chaeyeon','yooyeon','sumin','naekyung','yubin',
  'kaede','dahyun','kotone','yeonji','nien','sohyun','shinwi','mayu','rin',
  'jubin','hayeon','sion','chaewon','seollin','seoa','jiyeon'
];

const MEMBER_NAME = {
  seoyeon: '서연', hyerin: '혜린', jiwoo: '지우', chaeyeon: '채연', yooyeon: '유연',
  sumin: '수민', naekyung: '나경', yubin: '유빈', kaede: '카에데', dahyun: '다현',
  kotone: '코토네', yeonji: '연지', nien: '니엔', sohyun: '소현', shinwi: '신위',
  mayu: '마유', rin: '린', jubin: '주빈', hayeon: '하연', sion: '시온',
  chaewon: '채원', seollin: '설린', seoa: '서아', jiyeon: '지연'
};

const MEMBER_PERSONA = {
  seoyeon: '따뜻하고 언니같은 리더. 다정하고 배려심 깊은 말투. 팬들을 "여러분"이라 부름.',
  hyerin: '에너지 넘치고 귀여운. 리액션 왕. "ㅋㅋ" 자주 씀. 이모티콘 많이 사용.',
  jiwoo: '신비롭고 조용함. 짧고 임팩트 있는 말투. 시적인 표현.',
  chaeyeon: '밝고 활발함. "진짜ㅋㅋ" "맞아요!" 자주 씀.',
  yooyeon: '성숙하고 감성적. 차분한 말투.',
  sumin: '귀엽고 털털함. 웃음이 많음. 솔직함.',
  naekyung: '씩씩하고 에너지 넘침. 직설적이고 솔직함.',
  yubin: '세련되고 카리스마 있음. 쿨한 척하지만 팬들에게 약함.',
  kaede: '일본에서 온 멤버. 한국어 열심히 배우는 중. "근데 진짜로" 자주 씀.',
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

// Supabase에서 최근 메시지 가져오기
const headers = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/onair_messages?order=created_at.desc&limit=15`,
  { headers }
);
const recentMsgs = (await res.json()).reverse();

// 마지막으로 참여한 멤버 파악 (연속 방지)
let lastMemberId = null;
for (const msg of [...recentMsgs].reverse()) {
  const match = msg.author_name?.match(/^\[MEMBER:(\w+)\]/);
  if (match) {
    lastMemberId = match[1];
    break;
  }
}

const now = new Date().toISOString();
let activeMemberIds = [];
try {
  const activeRes = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_sessions?is_active=eq.true&ends_at=gt.${encodeURIComponent(now)}&select=member_id`,
    { headers }
  );
  if (!activeRes.ok) {
    throw new Error(`Failed to fetch active sessions: ${activeRes.status} ${activeRes.statusText}`);
  }
  const activeRows = await activeRes.json();
  activeMemberIds = activeRows.map(r => r.member_id);
} catch (error) {
  console.error(error);
  process.exit(1);
}

if (!activeMemberIds.length) {
  console.log('No active members in onair_sessions, skipping');
  process.exit(0);
}

// 멤버 선택 (마지막 멤버 제외, 랜덤)
const available = activeMemberIds.filter(m => m !== lastMemberId);
const memberId = available[Math.floor(Math.random() * available.length)];
const memberName = MEMBER_NAME[memberId];
const persona = MEMBER_PERSONA[memberId];

if (!memberId || !memberName) {
  console.log('Invalid member data, skipping');
  process.exit(0);
}

// 최근 대화 컨텍스트 구성
const contextLines = recentMsgs.slice(-10).map(m => {
  const match = m.author_name?.match(/^\[MEMBER:(\w+)\](.+)/);
  const name = match ? match[2] : m.author_name;
  return `${name}: ${m.content}`;
}).join('\n');

// Anthropic으로 자연스러운 응답 생성
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const response = await anthropic.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 150,
  messages: [{
    role: 'user',
    content: `너는 tripleS(트리플에스)의 멤버 ${memberName}이야.
페르소나: ${persona}

팬들과의 온에어 실시간 채팅방에 자연스럽게 끼어들어야 해.
최근 채팅 맥락:
${contextLines || '(대화 없음 - 처음 참여)'}

규칙:
- 1~2문장으로 짧게
- 맥락을 자연스럽게 이어받거나 인사
- 팬 이름 호명은 직전 메시지가 그 팬이 보낸 경우에만. 그 외에는 "여러분" "다들" 같은 일반 호칭
- 너무 형식적이지 않게, 진짜 채팅하는 것처럼
- 한국어로 (카에데/코토네/마유는 약간 어색한 한국어 OK)
- 이모티콘 페르소나에 맞게

메시지만 출력 (설명 없이)`
  }]
});

const content = response.content[0].text.trim();

// Supabase에 INSERT (author_name에 멤버 ID 인코딩)
await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
  method: 'POST',
  headers: { ...headers, Prefer: 'return=minimal' },
  body: JSON.stringify({
    content,
    author_name: `[MEMBER:${memberId}]${memberName}`
  })
});

console.log(`✅ ${memberName} posted: ${content}`);
