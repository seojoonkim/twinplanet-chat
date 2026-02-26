// 멀티계정 인스타그램 피드 API
// RapidAPI 한도 절약: 48시간 캐시, 계정당 최근 6개
const INSTAGRAM_ACCOUNTS = [
  // AG! 그룹 계정 (4멤버 공유)
  { username: 'atarashiigakko', memberIds: ['mizyu', 'rin', 'suzuka', 'kanon'], isGroup: true },
  // 개인 계정
  { username: 'yabuki_nako',               memberIds: ['nako'],     isGroup: false },
  { username: 'nana_suzuki79',             memberIds: ['nana'],     isGroup: false },
  { username: 'sugiurataiyou_official',    memberIds: ['taiyo'],    isGroup: false },
  { username: 'yooshiakiii',              memberIds: ['yoshiaki'], isGroup: false },
  { username: 'mi0306chi',                 memberIds: ['michi'],    isGroup: false },
  // AG! Japan 공식
  { username: 'japan_leaders', memberIds: ['mizyu', 'rin', 'suzuka', 'kanon'], isGroup: true },
];

// 캡션 기반 멤버 감지 (그룹 계정용)
const MEMBER_KEYWORDS = {
  mizyu:    ['MIZYU', 'ミジュ', '미쥬'],
  rin:      ['#RIN', 'RIN ', 'りん', '#rin'],
  suzuka:   ['SUZUKA', 'スズカ', '스즈카'],
  kanon:    ['KANON', 'かのん', '카논'],
};

function detectMemberFromCaption(caption, memberIds) {
  if (!caption || memberIds.length === 1) return memberIds[0];
  const text = caption;
  for (const [id, keywords] of Object.entries(MEMBER_KEYWORDS)) {
    if (memberIds.includes(id) && keywords.some(kw => text.includes(kw))) {
      return id;
    }
  }
  return null; // 감지 못하면 null → 호출부에서 seed 기반 처리
}

async function fetchAccountPosts(username, rapidApiKey) {
  const response = await fetch('https://instagram120.p.rapidapi.com/api/instagram/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': 'instagram120.p.rapidapi.com',
    },
    body: JSON.stringify({ username, maxId: '' }),
  });

  if (!response.ok) {
    console.error(`Instagram API error for @${username}: ${response.status}`);
    return [];
  }

  const data = await response.json();
  return data?.result?.edges || [];
}

function edgesToPosts(edges, account) {
  const posts = [];
  const maxPosts = 6; // 계정당 최근 6개

  for (const edge of edges.slice(0, maxPosts)) {
    const node = edge.node;
    const candidates = node.image_versions2?.candidates || [];
    const thumbnail = candidates[0]?.url || '';
    const caption = node.caption?.text || '';
    const shortcode = node.code || node.pk || '';
    const url = shortcode
      ? `https://www.instagram.com/p/${shortcode}/`
      : `https://www.instagram.com/${account.username}/`;

    // 멤버 ID 결정
    let memberId;
    if (!account.isGroup) {
      memberId = account.memberIds[0];
    } else {
      const detected = detectMemberFromCaption(caption, account.memberIds);
      memberId = detected; // null이면 FeedPage에서 seed 기반 fallback 처리
    }

    if (!thumbnail) continue;

    posts.push({
      id: node.pk || node.id || shortcode,
      url,
      thumbnail,
      caption,
      likes: node.like_count || 0,
      timestamp: node.taken_at ? node.taken_at * 1000 : Date.now(),
      memberId,         // null 가능 (그룹 계정 감지 실패 시)
      username: account.username,
    });
  }

  return posts;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 캐시 48시간 (RapidAPI 한도 절약)
  res.setHeader('Cache-Control', 's-maxage=172800, stale-while-revalidate=259200');

  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  if (!RAPIDAPI_KEY) return res.status(500).json({ error: 'RAPIDAPI_KEY not set' });

  try {
    // 병렬 fetch (모든 계정 동시)
    const results = await Promise.allSettled(
      INSTAGRAM_ACCOUNTS.map(account =>
        fetchAccountPosts(account.username, RAPIDAPI_KEY).then(edges =>
          edgesToPosts(edges, account)
        )
      )
    );

    const allPosts = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        allPosts.push(...result.value);
      } else {
        console.error(`Failed @${INSTAGRAM_ACCOUNTS[i].username}:`, result.reason);
      }
    });

    // 중복 제거 (같은 post id)
    const seen = new Set();
    const uniquePosts = allPosts.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    // 최신순 정렬
    uniquePosts.sort((a, b) => b.timestamp - a.timestamp);

    return res.json({
      posts: uniquePosts,
      source: 'instagram120-multi',
      count: uniquePosts.length,
      accounts: INSTAGRAM_ACCOUNTS.map(a => a.username),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
