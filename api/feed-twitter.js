// HTML entity decoding
function decodeEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Fan hashtag/keyword search query for TWIN PLANET / ATARASHII GAKKO!
// Excludes official account posts and retweets — fan posts only
const SEARCH_QUERY =
  '(#新しい学校のリーダーズ OR #ATARASHIIGAKKO OR #矢吹奈子 OR #鈴木奈々 OR #杉浦太陽 OR "新しい学校のリーダーズ" OR "ATARASHII GAKKO") -is:retweet -from:ATARASHIIGAKKO lang:ja';

function buildMaps(includes) {
  const mediaMap = {};
  ((includes && includes.media) || []).forEach(m => { mediaMap[m.media_key] = m; });
  const userMap = {};
  ((includes && includes.users) || []).forEach(u => { userMap[u.id] = u; });
  return { mediaMap, userMap };
}

function parseTweet(tweet, maps) {
  const { mediaMap, userMap } = maps;
  const user = userMap[tweet.author_id] || {};

  const media = (tweet.attachments?.media_keys || []).map(k => mediaMap[k]).filter(Boolean);
  const images = media
    .filter(m => m.type === 'photo' || m.type === 'animated_gif' || m.type === 'video')
    .map(m => m.url || m.preview_image_url)
    .filter(Boolean);

  const username = user.username || tweet.author_id;
  const text = decodeEntities(tweet.text || '');

  return {
    id: tweet.id,
    text,
    createdAt: tweet.created_at,
    url: `https://x.com/${username}/status/${tweet.id}`,
    likes: tweet.public_metrics?.like_count || 0,
    retweets: tweet.public_metrics?.retweet_count || 0,
    authorName: user.name || username,
    authorUsername: username,
    authorProfileImageUrl: user.profile_image_url || null,
    media,
    images,
    isRetweet: false,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  const BEARER = (process.env.TWITTER_BEARER_TOKEN || '').trim() || null;
  if (!BEARER) return res.status(500).json({ error: 'TWITTER_BEARER_TOKEN not set' });

  const params = new URLSearchParams({
    query: SEARCH_QUERY,
    max_results: '20',
    'tweet.fields': 'created_at,author_id,attachments,public_metrics',
    expansions: 'author_id,attachments.media_keys',
    'user.fields': 'name,username,profile_image_url',
    'media.fields': 'url,preview_image_url,type',
  });

  try {
    const searchRes = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?${params.toString()}`,
      { headers: { Authorization: `Bearer ${BEARER}` } }
    );
    const searchData = await searchRes.json();

    if (!searchData.data || searchData.data.length === 0) {
      return res.json({ tweets: [] });
    }

    const maps = buildMaps(searchData.includes);
    const tweets = searchData.data.map(t => parseTweet(t, maps));

    // Sort by date descending
    tweets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ tweets });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
