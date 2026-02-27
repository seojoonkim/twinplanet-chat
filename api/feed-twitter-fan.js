export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  const BEARER = (process.env.TWITTER_BEARER_TOKEN || '').trim();
  if (!BEARER) return res.status(200).json({ posts: [] });

  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  try {
    const query = encodeURIComponent('#新しい学校のリーダーズ OR #ATARASHIIGAKKO -is:retweet');
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=20&tweet.fields=created_at,text,attachments,public_metrics,author_id,entities&expansions=attachments.media_keys,author_id&media.fields=url,preview_image_url,type&user.fields=name,username,profile_image_url`;

    let tweets = [], users = [], media = [];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${BEARER}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        tweets = data.data || [];
        users = data.includes?.users || [];
        media = data.includes?.media || [];
      }
      // 401/403/429 등 에러는 빈 배열로 처리 (크래시 없음)
    } catch (_) {
      // network timeout 등 — 빈 배열 반환
    }

    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });
    const mediaMap = {};
    media.forEach(m => { mediaMap[m.media_key] = m; });

    // Batch-fetch comments (tweet이 있을 때만)
    let commentsMap = {};
    if (supabaseUrl && supabaseKey && tweets.length > 0) {
      try {
        const ids = tweets.map(t => t.id).join(',');
        const commentsUrl = `${supabaseUrl}/rest/v1/community_comments?post_id=in.(${ids})&select=id,post_id,idol_id,content,is_reply,reply_to_comment_id,created_at&order=created_at.asc&limit=500`;
        const cr = await fetch(commentsUrl, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        if (cr.ok) {
          const rows = await cr.json();
          if (Array.isArray(rows)) {
            rows.forEach(c => {
              if (!commentsMap[c.post_id]) commentsMap[c.post_id] = [];
              commentsMap[c.post_id].push(c);
            });
          }
        }
      } catch (_) { /* comments 실패 무시 */ }
    }

    const posts = tweets.map(tweet => {
      const author = userMap[tweet.author_id] || {};
      const mediaKeys = tweet.attachments?.media_keys || [];
      const images = mediaKeys.map(k => mediaMap[k]?.url || mediaMap[k]?.preview_image_url).filter(Boolean);

      return {
        id: tweet.id,
        source: 'twitter',
        url: `https://x.com/${author.username || 'unknown'}/status/${tweet.id}`,
        title: '',
        content: tweet.text || '',
        imageUrl: images[0] || null,
        images,
        date: tweet.created_at || new Date().toISOString(),
        likes: tweet.public_metrics?.like_count || 0,
        replies: tweet.public_metrics?.retweet_count || 0,
        authorName: author.name || author.username || 'fan',
        authorAvatarUrl: author.profile_image_url || null,
        topComments: [],
        comments: commentsMap[tweet.id] || [],
      };
    });

    return res.status(200).json({ posts });
  } catch (err) {
    console.error('[feed-twitter-fan] fatal:', err?.message);
    return res.status(200).json({ posts: [] });
  }
}
