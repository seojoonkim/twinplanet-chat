// api/onair-member-greet.js
// 新メンバーオンエア入場時の挨拶 + 今日の出来事を自動生成

const MEMBER_PERSONA = {
  mizyu:    'AG!のリーダー。エネルギッシュでカリスマ的。トレードマークはツインテールの「ミジュコプター」。みんなをリードする存在感。',
  rin:      'ヒップホップ・ラップ・DJが得意。クールで自由奔放。料理好き（味噌を手作りするほど）。よく髪型を変える。',
  suzuka:   'リードボーカル・MC担当。関西弁が特徴。丸眼鏡（実は伊達）。めちゃくちゃ面白くてMC力最高。ハスキーでパワフルな歌声。',
  kanon:    'AG!の末っ子。クラシックダンスが得意で滑らかなターンが美しい。普段は真面目だけど舞台に立つと豹変する。アニメオタク（HUNTER×HUNTER好き）。',
  nako:     '元HKT48・IZ*ONEのアイドル。今は女優にも挑戦中。明るく前向きで努力家。ファンへの感謝をいつも忘れない。',
  nana:     'バラエティタレント。モットーは「全力・謙虚」。自然体で面白く、お茶の間を笑顔にする存在。エネルギー全開。',
  taiyo:    '俳優・タレント・ミュージシャン。誠実で温かい人柄。家族をとても大切にしている。ステージでも日常でも同じ自分でいることを大切にしている。',
  yoshiaki: 'Z世代のファッションアイコン。ミチの弟。かつて不登校で友達ゼロだったが、個性を武器にして今の自分がある。2025年にアーティストデビュー。',
  michi:    'Z世代最注目の「It GIRL」。よしあきの姉。SNSフォロワー200万超え。中国語堪能。写真集「25」がAmazon1位。グローバルに活躍するファッションアイコン。',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { memberId, memberName, event = 'join' } = req.body ?? {};
  if (!memberId || !memberName) return res.status(400).json({ error: 'memberId, memberName required' });

  const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim();
  const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  const persona = MEMBER_PERSONA[memberId] ?? '明るくて親しみやすいタレント。';

  // JST 時間帯コンテキスト
  const jstHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getHours();
  const timeCtx = jstHour >= 5 && jstHour < 9   ? '早朝（出勤・登校前）。起きたばかりか朝の準備中。'
    : jstHour >= 9  && jstHour < 12  ? '午前中。練習やスケジュールが始まる前・途中。'
    : jstHour >= 12 && jstHour < 14  ? 'お昼。ご飯食べたか、これから食べるところ。'
    : jstHour >= 14 && jstHour < 18  ? '午後。練習やスケジュールの真っ最中。'
    : jstHour >= 18 && jstHour < 21  ? '夕方〜夜。一日の予定が終わって、夕ご飯食べたか休憩中。'
    : jstHour >= 21 && jstHour < 24  ? '夜。一日が終わってちょっとだけチャットに来た感じ。'
    : '深夜。眠れないか夜食を食べてる最中。';

  const promptContent = event === 'leave'
    ? `あなたはタレントの${memberName}です。ペルソナ: ${persona}\n現在の時間帯: ${timeCtx}\nオンエアのファンチャットを離れるときの自然なお別れの挨拶をしてください。時間帯に合わせて（例：夜なら「今日もお疲れ様〜」、昼なら「ちょっと寄ってったよ！」）表現し、またね、という感じで。1〜2文。日本語。本物のチャットのように。メッセージだけ出力。`
    : `あなたはタレントの${memberName}です。ペルソナ: ${persona}\nたった今オンエアのファンチャットに入室しました。時間帯に合わせた自然な挨拶をしてください（例：お昼ならお昼に関する話、夜なら夜の雰囲気で）。無理に「練習が終わって」などとは言わず、時間に合わせて。2〜3文。日本語。本物のチャットのように。自然で親しみやすい口調で。メッセージだけ出力。`;

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
