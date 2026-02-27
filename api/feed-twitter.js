// HTML entity decoding
function decodeEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Target accounts for TWIN PLANET / ATARASHII GAKKO!
const TARGET_USERNAMES = [
  'japanleaders',    // ATARASHII GAKKO! official (primary)
  'yabuki_nako',     // nako
  'nana_suzuki79',   // nana
  'sugiurataiyou',   // taiyo
  'yooshiakiii',     // yoshiaki
  'mi0306chi',       // michi
];

function buildTweetMap(tweets, media, users) {
  const mediaMap = {};
  (media || []).forEach(m => { mediaMap[m.media_key] = m; });
  const tweetMap = {};
  (tweets || []).forEach(t => { tweetMap[t.id] = t; });
  const userMap = {};
  (users || []).forEach(u => { userMap[u.id] = u; });
  return { mediaMap, tweetMap, userMap };
}

function parseTweet(tweet, maps, username) {
  const { mediaMap, tweetMap, userMap } = maps;
  const rtRef = tweet.referenced_tweets?.find(r => r.type === 'retweeted');
  const isRetweet = !!rtRef;

  let rtAuthorName = null, rtAuthorUsername = null, originalText = null;
  let urls = [];
  let media = (tweet.attachments?.media_keys || []).map(k => mediaMap[k]).filter(Boolean);

  if (isRetweet && rtRef) {
    const origTweet = tweetMap[rtRef.id];
    if (origTweet) {
      originalText = decodeEntities(origTweet.note_tweet?.text || origTweet.text || '');
      if (origTweet.author_id && userMap[origTweet.author_id]) {
        rtAuthorName = userMap[origTweet.author_id].name;
        rtAuthorUsername = userMap[origTweet.author_id].username;
      }
      const origMedia = (origTweet.attachments?.media_keys || []).map(k => mediaMap[k]).filter(Boolean);
      if (origMedia.length > 0) media = origMedia;
      const origUrls = origTweet.note_tweet?.entities?.urls || origTweet.entities?.urls || [];
      urls = origUrls.map(u => ({ url: u.url, expanded: u.expanded_url, display: u.display_url }));
    }
  } else {
    const fullText = tweet.note_tweet?.text || tweet.text || '';
    originalText = decodeEntities(fullText);
    const tweetUrls = tweet.note_tweet?.entities?.urls || tweet.entities?.urls || [];
    urls = tweetUrls.map(u => ({ url: u.url, expanded: u.expanded_url, display: u.display_url }));
  }

  const images = media
    .filter(m => m.type === 'photo' || m.type === 'animated_gif' || m.type === 'video')
    .map(m => m.url || m.preview_image_url)
    .filter(Boolean);

  return {
    id: tweet.id,
    text: originalText || decodeEntities(tweet.text || ''),
    createdAt: tweet.created_at,
    url: `https://x.com/${username}/status/${tweet.id}`,
    likes: tweet.public_metrics?.like_count || 0,
    retweets: tweet.public_metrics?.retweet_count || 0,
    media,
    images,
    urls,
    isRetweet,
    rtAuthorName,
    rtAuthorUsername,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  const BEARER = (process.env.TWITTER_BEARER_TOKEN || '').trim() || null;
  if (!BEARER) return res.status(500).json({ error: 'TWITTER_BEARER_TOKEN not set' });

  const FIELDS =
    '?max_results=10' +
    '&tweet.fields=created_at,text,note_tweet,attachments,public_metrics,referenced_tweets,author_id,entities' +
    '&expansions=attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id,referenced_tweets.id.attachments.media_keys' +
    '&media.fields=url,preview_image_url,type,width,height' +
    '&user.fields=name,username,profile_image_url';

  try {
    // Batch lookup all user IDs at once
    const usernamesQuery = TARGET_USERNAMES.join(',');
    const usersRes = await fetch(
      `https://api.twitter.com/2/users/by?usernames=${usernamesQuery}&user.fields=id,name,username,profile_image_url`,
      { headers: { Authorization: `Bearer ${BEARER}` } }
    );
    const usersData = await usersRes.json();

    if (!usersData.data || usersData.data.length === 0) {
      return res.status(500).json({ error: 'No users found', detail: usersData });
    }

    // Fetch tweets for each user in parallel
    const fetchPromises = usersData.data.map(async (user) => {
      try {
        const tweetsRes = await fetch(
          `https://api.twitter.com/2/users/${user.id}/tweets${FIELDS}`,
          { headers: { Authorization: `Bearer ${BEARER}` } }
        );
        const tweetsData = await tweetsRes.json();
        if (!tweetsData.data) return [];

        const maps = buildTweetMap(
          tweetsData.includes?.tweets,
          tweetsData.includes?.media,
          tweetsData.includes?.users
        );
        maps.userMap[user.id] = user;

        return tweetsData.data.map(t => parseTweet(t, maps, user.username));
      } catch {
        return [];
      }
    });

    const results = await Promise.allSettled(fetchPromises);
    const allTweets = [];
    results.forEach(r => {
      if (r.status === 'fulfilled') allTweets.push(...r.value);
    });

    // Sort by date descending
    allTweets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ tweets: allTweets.slice(0, 30) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
