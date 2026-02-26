export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const API_KEY = process.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = 'UCRa4EDGJEMpUfMRBRJKXbIg';

  if (!API_KEY) {
    return res.status(500).json({ error: 'YOUTUBE_API_KEY not set' });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?channelId=${CHANNEL_ID}&order=date&maxResults=10&part=snippet&type=video&key=${API_KEY}`
    );
    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const videos = (data.items || []).map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    return res.json({ videos });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
