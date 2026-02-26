// HTML entity 디코딩
function decodeEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  const BEARER = (process.env.TWITTER_BEARER_TOKEN || '').trim() || null;
  if (!BEARER) return res.status(500).json({ error: 'TWITTER_BEARER_TOKEN not set' });

  try {
    // 1. Get user ID for @ATARASHIIGAKKO
    const userRes = await fetch(
      'https://api.twitter.com/2/users/by/username/ATARASHIIGAKKO?user.fields=id,name,profile_image_url',
      { headers: { Authorization: `Bearer ${BEARER}` } }
    );
    const userData = await userRes.json();
    if (!userData.data) return res.status(500).json({ error: 'User not found', detail: userData });

    const userId = userData.data.id;

    // 2. Get tweets — retweet media via referenced_tweets.id.attachments.media_keys
    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets` +
      `?max_results=20` +
      `&tweet.fields=created_at,text,note_tweet,attachments,public_metrics,referenced_tweets,author_id,entities` +
      `&expansions=attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id,referenced_tweets.id.attachments.media_keys` +
      `&media.fields=url,preview_image_url,type,width,height` +
      `&user.fields=name,username,profile_image_url`,
      { headers: { Authorization: `Bearer ${BEARER}` } }
    );
    const tweetsData = await tweetsRes.json();
    if (!tweetsData.data) return res.status(500).json({ error: 'No tweets', detail: tweetsData });

    // Build lookup maps
    const mediaMap = {};
    (tweetsData.includes?.media || []).forEach(m => { mediaMap[m.media_key] = m; });

    const tweetMap = {};
    (tweetsData.includes?.tweets || []).forEach(t => { tweetMap[t.id] = t; });

    const userMap = {};
    (tweetsData.includes?.users || []).forEach(u => { userMap[u.id] = u; });

    const tweets = tweetsData.data.map(tweet => {
      // 리트윗 감지
      const rtRef = tweet.referenced_tweets?.find(r => r.type === 'retweeted');
      const isRetweet = !!rtRef;

      let rtAuthorName = null;
      let rtAuthorUsername = null;
      let originalText = null;
      let urls = [];
      let media = (tweet.attachments?.media_keys || []).map(k => mediaMap[k]).filter(Boolean);

      if (isRetweet && rtRef) {
        const origTweet = tweetMap[rtRef.id];
        if (origTweet) {
          // 원본 텍스트: note_tweet.text 우선 (280자 초과 트윗 전체 텍스트)
          originalText = decodeEntities(origTweet.note_tweet?.text || origTweet.text || '');
          // 원본 작성자
          if (origTweet.author_id && userMap[origTweet.author_id]) {
            rtAuthorName = userMap[origTweet.author_id].name;
            rtAuthorUsername = userMap[origTweet.author_id].username;
          }
          // 원본 미디어
          const origMedia = (origTweet.attachments?.media_keys || [])
            .map(k => mediaMap[k]).filter(Boolean);
          if (origMedia.length > 0) media = origMedia;
          // 원본 링크: note_tweet.entities 우선 (전체 URL 포함)
          const origUrls = origTweet.note_tweet?.entities?.urls || origTweet.entities?.urls || [];
          urls = origUrls.map(u => ({
            url: u.url,
            expanded: u.expanded_url,
            display: u.display_url,
          }));
        }
      } else {
        // 일반 트윗: note_tweet.text 우선 (280자 초과 트윗 전체 텍스트)
        const fullText = tweet.note_tweet?.text || tweet.text || '';
        originalText = decodeEntities(fullText);
        const tweetUrls = tweet.note_tweet?.entities?.urls || tweet.entities?.urls || [];
        urls = tweetUrls.map(u => ({
          url: u.url,
          expanded: u.expanded_url,
          display: u.display_url,
        }));
      }

      // 미디어 정규화 (photo만 이미지로, video는 썸네일)
      const images = media
        .filter(m => m.type === 'photo' || m.type === 'animated_gif' || m.type === 'video')
        .map(m => m.url || m.preview_image_url)
        .filter(Boolean);

      return {
        id: tweet.id,
        text: originalText || decodeEntities(tweet.text || ''),
        createdAt: tweet.created_at,
        url: `https://x.com/ATARASHIIGAKKO/status/${tweet.id}`,
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        media,
        images,
        urls,
        isRetweet,
        rtAuthorName,
        rtAuthorUsername,
      };
    });

    return res.json({ tweets });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
