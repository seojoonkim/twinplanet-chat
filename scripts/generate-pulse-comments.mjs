import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ANTHROPIC_API_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MEMBER_NAME = {
  'atarashii-gakko': '新しい学校のリーダーズ',
  nako: '矢吹奈子',
  nana: '鈴木奈々',
  taiyo: '杉浦太陽',
  yoshiaki: 'よしあき',
  michi: 'ミチ',
};

const MEMBER_PERSONA = {
  'atarashii-gakko': '4人組グループ。個性的で自由奔放。「個性と自由ではみ出していく」を体現。集合的な「私たち」口調。エネルギッシュで創造的。',
  nako: '元HKT48/IZ*ONE。温かく前向き。努力家で謙虚。日本語メイン、たまに韓国語。ファンへの愛情深い。',
  nana: 'バラエティタレント。全力・謙虚がモットー。天然で面白い。笑顔を届けることが使命。エネルギッシュ。',
  taiyo: '俳優・ミュージシャン。誠実で温かい。家族を大切にする。ステージと日常が地続き。',
  yoshiaki: 'Z世代ファッションアイコン。ミチの弟。不登校経験あり個性を武器にした。ONSENSEアーティスト。ユニークで本物。',
  michi: 'It GIRL。よしあきの姉。SNS200万超。クールで自信に満ちた。好きを貫く哲学。写真集「25」。',
};

const ALL_MEMBER_IDS = Object.keys(MEMBER_NAME);

function getRandomMembers(count) {
  const shuffled = [...ALL_MEMBER_IDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function generateComment(memberId, post) {
  const memberName = MEMBER_NAME[memberId];
  const persona = MEMBER_PERSONA[memberId];

  const prompt = `あなたはTWIN PLANETタレントの${memberName}です。
ペルソナ: ${persona}

ファンが掲示板に以下の投稿をしました:
タイトル: ${post.title}
内容: ${post.content || '(内容なし)'}

この投稿に合った自然なコメントを日本語で1〜2文作成してください。
- タレント本人のキャラと話し方を維持すること
- 投稿内容に具体的に反応すること
- 長くなりすぎないこと（2文以内）
- 自分の名前は言わないこと
- JSON形式で返す: {"comment": "コメント内容"}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';

  // Parse JSON from response
  const match = text.match(/\{[\s\S]*"comment"[\s\S]*\}/);
  if (!match) {
    throw new Error(`Failed to parse comment JSON from: ${text}`);
  }
  const parsed = JSON.parse(match[0]);
  return parsed.comment;
}

async function main() {
  console.log('🚀 Starting pulse member comment generation...');

  // 1. 최근 60분 내 생성된 포스트 조회
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: posts, error: postsError } = await supabase
    .from('pulse_posts')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (postsError) {
    console.error('Error fetching posts:', postsError);
    process.exit(1);
  }

  console.log(`📋 Found ${posts.length} posts in last 60 minutes`);

  if (posts.length === 0) {
    console.log('✅ No posts to process');
    return;
  }

  // 2. 멤버 댓글이 없는 포스트만 필터링
  const postsToProcess = [];
  for (const post of posts) {
    const { data: existingComments, error: commentsError } = await supabase
      .from('pulse_comments')
      .select('id')
      .eq('post_id', post.id)
      .eq('is_member_comment', true)
      .limit(1);

    if (commentsError) {
      console.warn(`Warning: Could not check comments for post ${post.id}:`, commentsError);
      continue;
    }

    if (!existingComments || existingComments.length === 0) {
      postsToProcess.push(post);
    }
  }

  console.log(`🎯 ${postsToProcess.length} posts need member comments`);

  // 최대 5개 처리
  const limited = postsToProcess.slice(0, 5);

  for (const post of limited) {
    console.log(`\n📝 Processing post: "${post.title}" (${post.id})`);

    // 1~3명 랜덤 멤버 선택
    const memberCount = Math.floor(Math.random() * 3) + 1;
    const selectedMembers = getRandomMembers(memberCount);

    console.log(`👥 Selected members: ${selectedMembers.map(id => MEMBER_NAME[id]).join(', ')}`);

    for (const memberId of selectedMembers) {
      try {
        const commentText = await generateComment(memberId, post);
        console.log(`  💬 ${MEMBER_NAME[memberId]}: ${commentText}`);

        const { error: insertError } = await supabase
          .from('pulse_comments')
          .insert({
            post_id: post.id,
            content: commentText,
            author_name: MEMBER_NAME[memberId],
            author_password: '',
            member_id: memberId,
            is_member_comment: true,
          });

        if (insertError) {
          console.error(`  ❌ Error inserting comment for ${MEMBER_NAME[memberId]}:`, insertError);
        } else {
          console.log(`  ✅ Comment inserted successfully`);
        }

        // Rate limit 방지: 멤버간 1초 간격
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`  ❌ Error generating comment for ${MEMBER_NAME[memberId]}:`, err.message);
      }
    }

    // 포스트간 2초 간격
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n🎉 Done! Pulse member comments generated successfully');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
