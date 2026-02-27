const REDDIT_USER_AGENT = 'twinplanet-chat/1.0 (fan app; contact via github)';

const PRIMARY_URL = 'https://www.reddit.com/r/atarashiigakko.json?limit=10';
const FALLBACK_URL = 'https://www.reddit.com/search.json?q=ATARASHII+GAKKO&sort=new&limit=10';

function parsePost(child) {
  const d = child.data;
  if (!d || d.stickied) return null;

  // Extract image URL if present
  let imageUrl = null;
  if (d.preview?.images?.[0]?.source?.url) {
    imageUrl = d.preview.images[0].source.url.replace(/&amp;/g, '&');
  } else if (d.thumbnail && d.thumbnail.startsWith('http')) {
    imageUrl = d.thumbnail;
  }

  return {
    id: `reddit_${d.id}`,
    source: 'reddit',
    sourceLabel: `r/${d.subreddit}`,
    url: `https://www.reddit.com${d.permalink}`,
    title: d.title || '',
    content: d.selftext || '',
    imageUrl,
    images: imageUrl ? [imageUrl] : [],
    date: new Date(d.created_utc * 1000).toISOString(),
    likes: d.score || 0,
    replies: d.num_comments || 0,
    authorName: d.author || 'reddit',
    topComments: [],
    comments: [],
  };
}

async function fetchReddit(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': REDDIT_USER_AGENT,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Reddit fetch failed: ${res.status}`);
  const json = await res.json();
  const children = json?.data?.children || [];
  return children.map(parsePost).filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=600');

  try {
    let posts = [];
    try {
      posts = await fetchReddit(PRIMARY_URL);
    } catch {
      // Fallback to search if subreddit doesn't exist or errors out
      try {
        posts = await fetchReddit(FALLBACK_URL);
      } catch {
        // Return empty array — never 500
        return res.status(200).json({ posts: [] });
      }
    }

    return res.status(200).json({ posts });
  } catch {
    // Safety net — never 500
    return res.status(200).json({ posts: [] });
  }
}
