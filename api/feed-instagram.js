export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 캐시 48시간 (이틀에 한번 호출 — 무료 한도 절약)
  res.setHeader('Cache-Control', 's-maxage=172800, stale-while-revalidate=259200');

  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  if (!RAPIDAPI_KEY) return res.status(500).json({ error: 'RAPIDAPI_KEY not set' });

  try {
    const response = await fetch('https://instagram120.p.rapidapi.com/api/instagram/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'instagram120.p.rapidapi.com',
      },
      body: JSON.stringify({ username: 'triplescosmos', maxId: '' }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `API error: ${response.status}` });
    }

    const data = await response.json();
    const edges = data?.result?.edges || [];

    const posts = edges.slice(0, 12).map(edge => {
      const node = edge.node;
      const candidates = node.image_versions2?.candidates || [];
      const thumbnail = candidates[0]?.url || '';
      const caption = node.caption?.text || '';
      const shortcode = node.code || node.pk || '';
      const url = shortcode
        ? `https://www.instagram.com/p/${shortcode}/`
        : 'https://www.instagram.com/triplescosmos/';

      return {
        id: node.pk || node.id || shortcode,
        url,
        thumbnail,
        caption,
        likes: node.like_count || 0,
        timestamp: node.taken_at ? node.taken_at * 1000 : Date.now(),
      };
    }).filter(p => p.thumbnail);

    return res.json({ posts, source: 'instagram120', count: posts.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
