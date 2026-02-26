// scripts/seed-onair.mjs
import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = 'https://imsxflgmgjiakkeoiffe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltc3hmbGdtZ2ppYWtrZW9pZmZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTYzNTUsImV4cCI6MjA4NjA3MjM1NX0._4xj8HyGIt2B1eFfOphPi2PGokEcBgelF9nf-snB2Tg';
const ANTHROPIC_API_KEY = 'REDACTED_ANTHROPIC_API_KEY';

const SEED_SEQUENCE = [
  { id: 'mizyu', name: 'MIZYU', persona: 'AG!リーダー。ミジュコプターで魅せる。エネルギッシュで頼もしい。', prompt: 'AG!リーダーとしてオンエアを開始する挨拶メッセージ' },
  { id: 'rin', name: 'RIN', persona: 'AG!メンバー。ヒップホップ&DJ担当。クールで自由奔放。', prompt: 'MIZYUの挨拶に続いてクールに参加するメッセージ' },
  { id: 'suzuka', name: 'SUZUKA', persona: 'AG!メンバー。大阪出身、関西弁。笑いとMCパワー全開。', prompt: '関西弁で元気よく挨拶するメッセージ' },
  { id: 'kanon', name: 'KANON', persona: 'AG!末っ子。普段は静か、ステージでは全力。アニオタ。', prompt: '静かでやさしい口調で参加するメッセージ' },
  { id: 'nako', name: '矢吹奈子', persona: '温かく前向き。努力家で謙虚。ファンへの愛情深い。', prompt: 'AG!に続いて参加する温かいメッセージ' },
  { id: 'nana', name: '鈴木奈々', persona: '全力・謙虚がモットー。天然で面白い。', prompt: 'ファンに元気よく挨拶するメッセージ' },
  { id: 'taiyo', name: '杉浦太陽', persona: '誠実で温かい。家族を大切にする。落ち着いた話し方。', prompt: '落ち着いたトーンで自然に参加するメッセージ' },
  { id: 'yoshiaki', name: 'よしあき', persona: 'Z世代ファッションアイコン。ユニークで本物。', prompt: 'ファッションの話題でさらっと登場するメッセージ' },
  { id: 'michi', name: 'ミチ', persona: 'It GIRL。クールで自信に満ちた。好きを貫く哲学。', prompt: 'クールに短く一言添えるメッセージ' },
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
      content: `あなたはTWIN PLANETタレントの${member.name}です。
ペルソナ: ${member.persona}
状況: ${member.prompt}
前の会話: ${conversationContext || '(なし)'}
ルール: 1〜2文、本物のチャットらしく、絵文字自然に、日本語のみ。
メッセージのみ出力。`
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
