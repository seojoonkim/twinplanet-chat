// scripts/seed-onair.mjs
import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = 'https://imsxflgmgjiakkeoiffe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltc3hmbGdtZ2ppYWtrZW9pZmZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTYzNTUsImV4cCI6MjA4NjA3MjM1NX0._4xj8HyGIt2B1eFfOphPi2PGokEcBgelF9nf-snB2Tg';
const ANTHROPIC_API_KEY = 'REDACTED_ANTHROPIC_API_KEY';

const SEED_SEQUENCE = [
  { id: 'seoyeon', name: '서연', persona: '따뜻하고 언니같은 리더. 팬들을 "여러분"이라 부름.', prompt: '처음 온에어 열면서 인사하는 메시지' },
  { id: 'hyerin', name: '혜린', persona: '에너지 넘치고 귀여운. 리액션 왕. "ㅋㅋ" 자주 씀.', prompt: '서연 언니 인사에 들뜬 반응' },
  { id: 'chaeyeon', name: '채연', persona: '밝고 활발함. "진짜ㅋㅋ" "맞아요!" 자주 씀.', prompt: '팬들한테 반갑다고 하는 메시지' },
  { id: 'naekyung', name: '나경', persona: '씩씩하고 에너지 넘침. 직설적이고 솔직함.', prompt: '운동하다 왔다는 식의 자연스러운 참여' },
  { id: 'yubin', name: '유빈', persona: '세련되고 카리스마 있음. 쿨한 척하지만 팬들에게 약함.', prompt: '쿨하게 한마디 던지는 메시지' },
  { id: 'jiwoo', name: '지우', persona: '신비롭고 조용함. 짧고 임팩트있는 말투. 시적인 표현.', prompt: '짧고 감성적인 한마디' },
];

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

let conversationContext = '';

for (const member of SEED_SEQUENCE) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `너는 tripleS(트리플에스)의 멤버 ${member.name}이야.
페르소나: ${member.persona}
상황: ${member.prompt}
이전 대화: ${conversationContext || '(없음)'}
규칙: 1~2문장, 진짜 채팅처럼, 이모티콘 자연스럽게, 한국어만.
메시지만 출력.`
    }]
  });

  const content = response.content[0].text.trim();
  conversationContext += `\n${member.name}: ${content}`;

  await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      content,
      author_name: `[MEMBER:${member.id}]${member.name}`
    })
  });

  console.log(`✅ ${member.name}: ${content}`);
  await new Promise(r => setTimeout(r, 1500)); // 1.5초 간격
}
