const fs = require('fs');
const path = require('path');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

const OUTPUT = path.join(__dirname, '..', 'public', 'feed-data.json');

async function fetchYouTube() {
  if (!YOUTUBE_API_KEY) { console.log('[YouTube] No API key, skipping'); return []; }
  try {
    const CHANNEL_ID = 'UCJnL-TBcsYrF2SLs7tmiC8Q';
    // Step 1: 최신 영상 목록 (더 많이 가져와서 필터 후 10개 확보)
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?channelId=${CHANNEL_ID}&order=date&maxResults=20&part=snippet&type=video&key=${YOUTUBE_API_KEY}`
    );
    const searchData = await searchRes.json();
    if (searchData.error) { console.log('[YouTube] API error:', searchData.error.message); return []; }

    const items = searchData.items || [];
    if (items.length === 0) return [];

    // Step 2: video status 확인 (비공개/임베드 불가 필터)
    const videoIds = items.map(item => item.id.videoId).join(',');
    const statusRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoIds}&part=status&key=${YOUTUBE_API_KEY}`
    );
    const statusData = await statusRes.json();
    const embeddableIds = new Set(
      (statusData.items || [])
        .filter(v => v.status?.embeddable === true && v.status?.privacyStatus === 'public')
        .map(v => v.id)
    );
    console.log(`[YouTube] Total: ${items.length}, Embeddable public: ${embeddableIds.size}`);

    return items
      .filter(item => embeddableIds.has(item.id.videoId))
      .slice(0, 10)
      .map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));
  } catch (err) {
    console.log('[YouTube] Error:', err.message);
    return [];
  }
}

async function fetchTwitter() {
  if (!TWITTER_BEARER_TOKEN) { console.log('[Twitter] No bearer token, skipping'); return []; }
  try {
    const userId = '1509037477369024517';
    const res = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,text,attachments,public_metrics&expansions=attachments.media_keys,author_id&media.fields=url,preview_image_url,type&user.fields=username,profile_image_url`,
      { headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` } }
    );
    const data = await res.json();
    if (!data.data) { console.log('[Twitter] No data:', JSON.stringify(data).slice(0, 200)); return []; }

    const mediaMap = {};
    (data.includes?.media || []).forEach(m => { mediaMap[m.media_key] = m; });
    const usersMap = {};
    (data.includes?.users || []).forEach(u => { usersMap[u.id] = u; });

    const tweets = data.data || [];
    const videoUrlMap = {};

    const fetchVideoFromFxtwitter = async (screenName, tweetId) => {
      const fxtwitterRes = await fetch(`https://api.fxtwitter.com/${screenName}/status/${tweetId}`);
      if (!fxtwitterRes.ok) return null;
      const fxData = await fxtwitterRes.json();
      const videos = fxData?.tweet?.media?.videos || [];
      if (videos[0]?.url) return videos[0].url;
      const all = fxData?.tweet?.media?.all || [];
      return all.find(v => v.type === 'video')?.url || null;
    };

    let videoFetchAttempts = 0;
    for (const tweet of tweets) {
      const mediaKeys = tweet.attachments?.media_keys || [];
      const hasVideoMedia = mediaKeys.some(k => {
        const media = mediaMap[k];
        return media?.type === 'video' || media?.type === 'animated_gif';
      });
      const screenName = usersMap[tweet.author_id]?.username;
      if (!hasVideoMedia || !tweet.id || !screenName) continue;
      if (videoFetchAttempts >= 20) continue;
      videoFetchAttempts += 1;
      try {
        videoUrlMap[tweet.id] = await fetchVideoFromFxtwitter(screenName, tweet.id);
      } catch (e) {
        videoUrlMap[tweet.id] = null;
      }
    }

    return tweets.map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at,
      url: `https://x.com/triplescosmos/status/${tweet.id}`,
      likes: tweet.public_metrics?.like_count || 0,
      retweets: tweet.public_metrics?.retweet_count || 0,
      videoUrl: videoUrlMap[tweet.id] || null,
      authorAvatarUrl: (usersMap[tweet.author_id]?.profile_image_url || '').replace('_normal', '_400x400'),
      media: (tweet.attachments?.media_keys || []).map(k => mediaMap[k]).filter(Boolean),
    }));
  } catch (err) {
    console.log('[Twitter] Error:', err.message);
    return [];
  }
}

async function fetchInstagram() {
  if (!RAPIDAPI_KEY) { console.log('[Instagram] No API key, skipping'); return []; }
  try {
    const res = await fetch('https://instagram120.p.rapidapi.com/api/instagram/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'instagram120.p.rapidapi.com',
      },
      body: JSON.stringify({ username: 'triplescosmos', maxId: '' }),
    });
    if (!res.ok) { console.log('[Instagram] HTTP', res.status); return []; }
    const data = await res.json();
    const edges = data?.result?.edges || [];
    return edges.slice(0, 12).map(edge => {
      const node = edge.node;
      const candidates = node.image_versions2?.candidates || [];
      const thumbnail = candidates[0]?.url || '';
      const caption = node.caption?.text || '';
      const shortcode = node.code || node.pk || '';
      const isVideo = !!(node.is_video || node.product_type === 'clips');
      const videoUrl = node.video_url || node.dash_info?.video_dash_manifest || null;
      return {
        id: node.pk || node.id || shortcode,
        url: shortcode ? `https://www.instagram.com/p/${shortcode}/` : 'https://www.instagram.com/triplescosmos/',
        thumbnail,
        caption,
        likes: node.like_count || 0,
        timestamp: node.taken_at ? node.taken_at * 1000 : Date.now(),
        is_video: isVideo,
        videoUrl,
      };
    }).filter(p => p.thumbnail);
  } catch (err) {
    console.log('[Instagram] Error:', err.message);
    return [];
  }
}

async function main() {
  console.log('Fetching feed data...');
  const [youtube, twitter, instagram] = await Promise.all([
    fetchYouTube(),
    fetchTwitter(),
    fetchInstagram(),
  ]);

  const result = {
    updatedAt: new Date().toISOString(),
    youtube,
    twitter,
    instagram,
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
  console.log(`Done! YouTube: ${youtube.length}, Twitter: ${twitter.length}, Instagram: ${instagram.length}`);
  console.log(`Written to ${OUTPUT}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
