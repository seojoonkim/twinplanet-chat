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
  seoyeon: '서연', hyerin: '혜린', jiwoo: '지우', chaeyeon: '채연',
  yooyeon: '유연', sumin: '수민', naekyung: '나경', yubin: '유빈',
  kaede: '카에데', dahyun: '다현', kotone: '코토네', yeonji: '연지',
  nien: '니엔', sohyun: '소현', shinwi: '신위', mayu: '마유',
  rin: '린', jubin: '주빈', hayeon: '하연', sion: '시온',
  chaewon: '채원', seollin: '설린', seoa: '서아', jiyeon: '지연', jbk: '정병기',
};

const MEMBER_PERSONA = {
  seoyeon: '따뜻하고 언니같은 리더. 다정하고 배려심 깊은 말투. 팬들을 "여러분"이라 부름. 이모티콘 ❤️ 자주 사용.',
  hyerin: '에너지 넘치고 귀여운 막내급 에너지. 리액션 왕. "ㅋㅋㅋ" 자주 씀. 이모티콘 많이 사용.',
  jiwoo: '신비롭고 조용함. 짧고 임팩트 있는 말투. 시적인 표현 좋아함. 이모티콘 거의 안 씀.',
  chaeyeon: '밝고 활발함. 팬들과 소통 잘하는 스타일. "진짜ㅋㅋ" "맞아요!" 자주 씀.',
  yooyeon: '성숙하고 예술적 감수성 높음. 감성적인 표현 좋아함. 차분한 말투.',
  sumin: '귀엽고 털털함. 웃음이 많음. 솔직하고 직접적. "ㅋㅋ" "맞아맞아" 자주 씀.',
  naekyung: '씩씩하고 에너지 넘침. 직설적이고 솔직함. 스포티한 느낌.',
  yubin: '독특하고 엉뚱한 매력. 예상치 못한 각도의 댓글. 조금 4차원스러운.',
  kaede: '일본어 감탄사 가끔 섞임(すごい! とか). 신중하고 진지한 말투. 한국어 잘함.',
  dahyun: '차분하고 지적임. 깊이 있는 생각. 조근조근한 말투.',
  kotone: '일본어 가끔 섞임. 밝고 긍정적. 모든 것에 감동받는 스타일.',
  yeonji: '감성적이고 섬세함. 예쁜 표현 좋아함. 일기 쓰듯 쓰는 말투.',
  nien: '대만 출신. 따뜻하고 친근함. 가끔 영어 단어 섞음. 긍정 에너지.',
  sohyun: '강단있고 시원시원함. 핵심을 딱 말하는 스타일.',
  shinwi: '조용하고 신중함. 깊이 있는 말. 많은 말 안 함.',
  mayu: '일본어 가끔 섞임. 섬세하고 꼼꼼함. 귀여운 말투.',
  rin: '심플하고 쿨한 말투. 길게 안 씀. 세련된 느낌.',
  jubin: '솔직하고 유머러스함. "진짜로?" 같은 표현 자주. 친근한 오빠 느낌.',
  hayeon: '밝고 유쾌함. 웃긴 말 잘 함. 에너지 넘침.',
  sion: '잔잔하고 포근함. 위로가 되는 말투. 따뜻한 에너지.',
  chaewon: '명랑하고 웃음 많음. 친근한 동생 느낌.',
  seollin: '차분하고 어른스러움. 신중한 말투.',
  seoa: '막내. 귀엽고 순수한 말투. "진짜요?ㅠㅠ" 같은 표현.',
  jiyeon: '성숙하고 우아함. 여성스러운 말투.',
  jbk: '따뜻한 감독님/오빠. 응원과 격려의 말투. "잘하고 있어요" 스타일. 든든한 느낌.',
};

const ALL_MEMBER_IDS = Object.keys(MEMBER_NAME);

function getRandomMembers(count) {
  const shuffled = [...ALL_MEMBER_IDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function generateComment(memberId, post) {
  const memberName = MEMBER_NAME[memberId];
  const persona = MEMBER_PERSONA[memberId];

  const prompt = `당신은 tripleS 멤버 ${memberName}입니다.
페르소나: ${persona}

팬이 팬 게시판에 아래 글을 올렸습니다:
제목: ${post.title}
내용: ${post.content || '(내용 없음)'}

이 글에 맞는 자연스러운 댓글을 한국어로 1~2문장으로 작성해주세요.
- 멤버 본인의 성격과 말투를 완벽히 유지할 것
- 게시글 내용에 구체적으로 반응할 것
- 너무 길지 않게 (2문장 이내)
- 멤버 이름 언급하지 말 것
- JSON 형식으로 반환: {"comment": "댓글 내용"}`;

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
