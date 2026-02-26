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

  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  if (!RAPIDAPI_KEY) return res.status(500).json({ error: 'RAPIDAPI_KEY not set' });

  try {
    // Try Twitter241 API (RapidAPI)
    const response = await fetch(
      'https://twitter241.p.rapidapi.com/user-tweets?username=ATARASHIIGAKKO&count=20',
      {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'twitter241.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: `API error: ${response.status}` });
    }

    const data = await response.json();

    // twitter241 response structure: data.result.timeline.instructions[].entries
    const instructions = data?.result?.timeline?.instructions || [];
    const entries = instructions.flatMap(inst => inst.entries || []);

    const tweets = entries
      .filter(e => e?.content?.itemContent?.tweet_results?.result?.legacy)
      .map(e => {
        const legacy = e.content.itemContent.tweet_results.result.legacy;
        const user = e.content.itemContent.tweet_results.result.core?.user_results?.result?.legacy;
        const media = legacy.extended_entities?.media || legacy.entities?.media || [];
        const images = media
          .filter(m => m.type === 'photo' || m.type === 'video' || m.type === 'animated_gif')
          .map(m => m.media_url_https || m.media_url)
          .filter(Boolean);

        const isRetweet = !!legacy.retweeted_status_result;
        const text = decodeEntities(legacy.full_text || legacy.text || '');
        const cleanText = text.replace(/https?:\/\/t\.co\/\S+/g, '').trim();

        return {
          id: legacy.id_str || e.entryId,
          text: cleanText,
          createdAt: legacy.created_at,
          url: `https://x.com/ATARASHIIGAKKO/status/${legacy.id_str}`,
          likes: legacy.favorite_count || 0,
          retweets: legacy.retweet_count || 0,
          images,
          isRetweet,
          rtAuthorName: isRetweet ? user?.name : null,
          rtAuthorUsername: isRetweet ? user?.screen_name : null,
          urls: (legacy.entities?.urls || []).map(u => ({
            url: u.url, expanded: u.expanded_url, display: u.display_url,
          })),
        };
      })
      .filter(t => t.text.length > 0)
      .slice(0, 15);

    return res.json({ tweets });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
