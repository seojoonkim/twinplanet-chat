export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  const BEARER = (process.env.TWITTER_BEARER_TOKEN || '').trim();
  if (!BEARER) return res.status(500).json({ error: 'TWITTER_BEARER_TOKEN not set' });

  const query = encodeURIComponent('#新しい学校のリーダーズ OR #ATARASHIIGAKKO -is:retweet lang:ja');
  const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=20&tweet.fields=created_at,text,attachments,public_metrics,author_id,entities&expansions=attachments.media_keys,author_id&media.fields=url,preview_image_url,type&user.fields=name,username,profile_image_url`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${BEARER}` }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: await response.text() });
    }
    const data = await response.json();

    // data.data: tweets, data.includes.users: users, data.includes.media: media
    const tweets = data.data || [];
    const users = (data.includes?.users || []);
    const media = (data.includes?.media || []);

    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });
    const mediaMap = {};
    media.forEach(m => { mediaMap[m.media_key] = m; });

    const posts = tweets.map(tweet => {
      const author = userMap[tweet.author_id] || {};
      const mediaKeys = tweet.attachments?.media_keys || [];
      const images = mediaKeys.map(k => mediaMap[k]?.url || mediaMap[k]?.preview_image_url).filter(Boolean);

      return {
        id: `fan_${tweet.id}`,
        source: 'twitter',
        url: `https://x.com/${author.username || 'unknown'}/status/${tweet.id}`,
        title: '',
        content: tweet.text,
        imageUrl: images[0] || null,
        images,
        date: tweet.created_at,
        likes: tweet.public_metrics?.like_count || 0,
        replies: tweet.public_metrics?.retweet_count || 0,
        authorName: author.name || author.username || 'fan',
        authorAvatarUrl: author.profile_image_url || null,
        topComments: [],
        comments: [],
      };
    });

    return res.status(200).json({ posts });
  } catch (err) {
    console.error('[feed-twitter-fan] error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
