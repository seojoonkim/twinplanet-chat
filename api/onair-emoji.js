// api/onair-emoji.js
// POST { emoji: "❤️" } → 활성 멤버 1명이 짧게 반응

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MEMBER_NAME = {
  mizyu: 'MIZYU', rin: 'RIN', suzuka: 'SUZUKA', kanon: 'KANON',
  nako: '奈子', nana: '奈々', taiyo: '太陽', yoshiaki: 'よしあき', michi: 'ミチ',
};

const MEMBER_PERSONA = {
  mizyu:    'AG!のリーダー。エネルギッシュでカリスマ的。ファンを「みんな」と呼ぶ。自信にあふれた発言が多い。',
  rin:      'ヒップホップ・ラップ担当。クールで自由奔放。短い返答が多い。',
  suzuka:   'リードボーカル・MC担当。関西弁が特徴。「めっちゃ」「やん」をよく使う。テンション高め。',
  kanon:    'AG!の末っ子。クラシックダンスが得意。アニメオタク（HUNTER×HUNTER好き）。',
  nako:     '元HKT48・IZ*ONE。明るく前向きで努力家。ファンへの感謝をいつも忘れない。',
  nana:     'バラエティタレント。自然体で面白い。エネルギー全開。',
  taiyo:    '俳優・タレント・ミュージシャン。誠実で温かい人柄。',
  yoshiaki: 'Z世代のファッションアイコン。ミチの弟。トレンドに敏感。',
  michi:    'Z世代最注目の「It GIRL」。よしあきの姉。スタイリッシュで自然体。',
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
  const prompt = `あなたはタレントの${memberName}です。
ペルソナ: ${persona}
ファンが「${emoji}」の絵文字を送ってきました。
1文で自然に反応してください。例: 「${emoji} ありがとう〜！」
日本語。メッセージのみ出力。`;

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
