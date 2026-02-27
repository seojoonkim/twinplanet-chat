// scripts/onair-member-chat.mjs
// GitHub Actions에서 3분마다 실행됨
// 75% 확률로 실행 (더 자주)
// 같은 멤버 연속 2번 안됨
// 최근 메시지 맥락 파악 후 AI 응답

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// 75% 확률로 실행 (3분 간격 → 더 자주)
if (Math.random() > 0.75) {
  console.log('Skip this run (random interval)');
  process.exit(0);
}

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
  mizyu:    'AG!のリーダー。エネルギッシュでカリスマ的。トレードマークはツインテールの「ミジュコプター」。きゃりーぱみゅぱみゅのバックダンサー出身。ちゃんみなの幼馴染。みんなをリードする存在感。',
  rin:      'ヒップホップ・ラップ・DJが得意。クールで自由奔放。料理好き（味噌を手作りするほど）。よく髪型を変える。',
  suzuka:   'リードボーカル・MC担当。関西弁が特徴。丸眼鏡（実は伊達）。めちゃくちゃ面白くてMC力最高。ハスキーでパワフルな歌声。',
  kanon:    'AG!の末っ子。クラシックダンスが得意で滑らかなターンが美しい。普段は真面目だけど舞台に立つと豹変する。アニメオタク（HUNTER×HUNTER好き）。',
  nako:     '元HKT48・IZ*ONEのアイドル。今は女優にも挑戦中。明るく前向きで努力家。ファンへの感謝をいつも忘れない。',
  nana:     'バラエティタレント。モットーは「全力・謙虚」。自然体で面白く、お茶の間を笑顔にする存在。エネルギー全開。',
  taiyo:    '俳優・タレント・ミュージシャン。誠実で温かい人柄。家族をとても大切にしている。ステージでも日常でも同じ自分でいることを大切にしている。',
  yoshiaki: 'Z世代のファッションアイコン。ミチの弟。かつて不登校で友達ゼロだったが、個性を武器にして今の自分がある。2025年にアーティストデビュー。',
  michi:    'Z世代最注目の「It GIRL」。よしあきの姉。SNSフォロワー200万超え。中国語堪能。写真集「25」がAmazon1位。グローバルに活躍するファッションアイコン。',
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

// 현재 토픽 fetch
let currentTopic = '';
try {
  const topicRes = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_messages?author_name=eq.[TOPIC]&order=created_at.desc&limit=1&select=content`,
    { headers }
  );
  const topicData = await topicRes.json();
  currentTopic = topicData?.[0]?.content || '';
} catch {}

// 최근 대화 컨텍스트 구성
const contextLines = recentMsgs.slice(-10).map(m => {
  const match = m.author_name?.match(/^\[MEMBER:(\w+)\](.+)/);
  const name = match ? match[2] : m.author_name;
  return `${name}: ${m.content}`;
}).join('\n');

// OpenRouter으로 자연스러운 응답 생성
const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-4o-mini',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `あなたはタレントの${memberName}です。
ペルソナ: ${persona}
${currentTopic ? `\n現在のトピック: 「${currentTopic}」\n` : ''}
ファンとのオンエアリアルタイムチャットに自然に参加してください。
直近のチャット:
${contextLines || '（会話なし — 初参加）'}

ルール:
- 1〜2文で短く
- ${currentTopic ? `現在のトピック「${currentTopic}」について自然に話すか、話を膨らませて。` : '流れを自然に受けて挨拶か一言。'}
- ファン名は直前のメッセージがそのファンからの場合のみ呼ぶ。それ以外は「みんな」「ファンのみんな」など一般的な呼び方
- 堅すぎず、本物のチャットのように
- 必ず日本語で
- 絵文字はペルソナに合わせて

メッセージだけ出力（説明不要）`
    }]
  }),
});
const orData = await orRes.json();

const content = orData?.choices?.[0]?.message?.content?.trim() ?? '';

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
