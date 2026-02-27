export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  const BEARER = (process.env.TWITTER_BEARER_TOKEN || '').trim();
  if (!BEARER) return res.status(500).json({ error: 'TWITTER_BEARER_TOKEN not set' });

  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY || '').trim();

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

    const tweets = data.data || [];
    const users = (data.includes?.users || []);
    const media = (data.includes?.media || []);

    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });
    const mediaMap = {};
    media.forEach(m => { mediaMap[m.media_key] = m; });

    // Batch-fetch comments from community_comments for all tweet IDs
    let commentsMap = {};
    if (supabaseUrl && supabaseKey && tweets.length > 0) {
      try {
        const tweetIds = tweets.map(t => t.id).join(',');
        const commentsUrl = `${supabaseUrl}/rest/v1/community_comments?post_id=in.(${tweetIds})&select=id,post_id,idol_id,content,is_reply,reply_to_comment_id,created_at&order=created_at.asc&limit=500`;
        const commentsRes = await fetch(commentsUrl, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          }
        });
        if (commentsRes.ok) {
          const allComments = await commentsRes.json();
          allComments.forEach(c => {
            if (!commentsMap[c.post_id]) commentsMap[c.post_id] = [];
            commentsMap[c.post_id].push(c);
          });
        }
      } catch (e) { /* comments 실패해도 feed는 반환 */ }
    }

    const posts = tweets.map(tweet => {
      const author = userMap[tweet.author_id] || {};
      const mediaKeys = tweet.attachments?.media_keys || [];
      const images = mediaKeys.map(k => mediaMap[k]?.url || mediaMap[k]?.preview_image_url).filter(Boolean);
      const comments = commentsMap[tweet.id] || [];

      return {
        id: tweet.id,  // raw ID (community_comments post_id와 일치)
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
        comments,
      };
    });

    return res.status(200).json({ posts });
  } catch (err) {
    console.error('[feed-twitter-fan] error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
