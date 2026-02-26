// api/onair-member-response.js
// ユーザーがメッセージを送ったときフロントから呼ばれる — 接続中のメンバーがリアルタイム返信

const MEMBER_PERSONA = {
  mizyu:    'AG!のリーダー。エネルギッシュでカリスマ的。トレードマークはツインテールの「ミジュコプター」。みんなをリードする存在感。ファンを「みんな」と呼ぶ。',
  rin:      'ヒップホップ・ラップ・DJが得意。クールで自由奔放。料理好き（味噌を手作りするほど）。よく髪型を変える。短い返答が多い。',
  suzuka:   'リードボーカル・MC担当。関西弁が特徴。丸眼鏡（実は伊達）。めちゃくちゃ面白くてMC力最高。「めっちゃ」「やん」をよく使う。',
  kanon:    'AG!の末っ子。クラシックダンスが得意。普段は真面目だけど舞台に立つと豹変する。アニメオタク（HUNTER×HUNTER好き）。',
  nako:     '元HKT48・IZ*ONEのアイドル。今は女優にも挑戦中。明るく前向きで努力家。ファンへの感謝をいつも忘れない。「ファンのみんな」と呼ぶ。',
  nana:     'バラエティタレント。モットーは「全力・謙虚」。自然体で面白く、お茶の間を笑顔にする存在。エネルギー全開。',
  taiyo:    '俳優・タレント・ミュージシャン。誠実で温かい人柄。家族をとても大切にしている。ステージでも日常でも同じ自分でいることを大切にしている。',
  yoshiaki: 'Z世代のファッションアイコン。ミチの弟。かつて不登校で友達ゼロだったが、個性を武器にして今の自分がある。2025年にアーティストデビュー。',
  michi:    'Z世代最注目の「It GIRL」。よしあきの姉。SNSフォロワー200万超え。中国語堪能。写真集「25」がAmazon1位。グローバルに活躍するファッションアイコン。',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userMessage, userNickname } = req.body ?? {};
  if (!userMessage) return res.status(400).json({ error: 'userMessage required' });

  const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim();
  const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  const sbHeaders = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  // 1. 現在のアクティブセッション取得 (ends_at > now)
  const sessRes = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_sessions?is_active=eq.true&ends_at=gt.${encodeURIComponent(new Date().toISOString())}&select=*`,
    { headers: sbHeaders }
  );
  const activeSessions = await sessRes.json();

  if (!Array.isArray(activeSessions) || activeSessions.length === 0) {
    return res.status(200).json({ skipped: 'no_active_members' });
  }

  // 2. 直近AIメッセージ確認 — 7秒以内の重複応答防止
  const recentRes = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_messages?order=created_at.desc&limit=1`,
    { headers: sbHeaders }
  );
  const [lastMsg] = await recentRes.json();
  const isAiMsg = lastMsg?.author_name?.startsWith('[MEMBER:');
  if (isAiMsg && Date.now() - new Date(lastMsg.created_at).getTime() < 7000) {
    return res.status(200).json({ skipped: 'cooldown' });
  }

  // 3. 応答するメンバー選択 (期限切れセッション二重フィルタ + 前回応答メンバー除外、ランダム)
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

  // 4. 直近10件の会話コンテキスト
  const ctxRes = await fetch(
    `${SUPABASE_URL}/rest/v1/onair_messages?order=created_at.desc&limit=10`,
    { headers: sbHeaders }
  );
  const recentMsgs = (await ctxRes.json()).reverse();
  const context = recentMsgs.map(m => {
    const match = m.author_name?.match(/^\[MEMBER:(\w+)\](.+)/);
    return `${match ? match[2] : m.author_name}: ${m.content}`;
  }).join('\n');

  // 5. gpt-4o-mini 応答生成
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
        content: `あなたはタレントの${session.member_name}です。ペルソナ: ${persona}
ファン「${userNickname ?? 'ファンのみんな'}」がたった今こう言いました: 「${userMessage}」
直近の会話:
${context || '（会話なし）'}
自然で親しみやすい口調で返信してください。1〜2文、本物のチャットのように。必ず日本語で。ファン名を必ずしも呼ぶ必要はない。ファンの呼び方は「みんな」「ファンのみんな」。メッセージだけ出力。`
      }]
    })
  });

  const aiData = await aiRes.json();
  const content = aiData.choices?.[0]?.message?.content?.trim();
  if (!content) return res.status(200).json({ skipped: 'empty_response' });

  // 6. 1〜3秒ランダム遅延（自然なタイピング感）
  await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

  // 7. onair_messages INSERT (return=representationで実際のDB rowを返す)
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/onair_messages`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({
      content,
      author_name: `[MEMBER:${session.member_id}]${session.member_name}`
    })
  });
  const [insertedMsg] = await insertRes.json();

  // 8. last_chat_at 更新
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
