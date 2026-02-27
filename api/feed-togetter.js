// Google News RSS for 新しい学校のリーダーズ (JP community feed)
// Named feed-togetter.js for compatibility with CommunityPage source type

function parseXmlItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
    const guidMatch = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    const descMatch = block.match(/<description>([\s\S]*?)<\/description>/);

    const title = titleMatch ? decodeXml(titleMatch[1].trim()) : '';
    const link = linkMatch ? linkMatch[1].trim() : (guidMatch ? guidMatch[1].trim() : '');
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
    const sourceLabel = sourceMatch ? decodeXml(sourceMatch[1].trim()) : 'Google News';
    const desc = descMatch ? decodeXml(descMatch[1].trim()) : '';

    // Strip any HTML tags from description
    const cleanDesc = desc.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim();

    if (title) {
      items.push({
        id: `togetter_${Buffer.from(link).toString('base64').slice(0, 16)}`,
        source: 'togetter',
        sourceLabel,
        url: link,
        title,
        content: cleanDesc,
        imageUrl: null,
        images: [],
        date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        likes: 0,
        replies: 0,
        authorName: sourceLabel,
        topComments: [],
        comments: [],
      });
    }
  }
  return items;
}

function decodeXml(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');

  try {
    const q = encodeURIComponent('新しい学校のリーダーズ OR ATARASHII GAKKO');
    const url = `https://news.google.com/rss/search?q=${q}&hl=ja&gl=JP&ceid=JP:ja`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'twinplanet-chat/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      return res.status(200).json({ posts: [] });
    }

    const xml = await response.text();
    let posts = parseXmlItems(xml).slice(0, 15);

    // Batch-fetch comments from community_comments
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
    if (supabaseUrl && supabaseKey && posts.length > 0) {
      try {
        const ids = posts.map(p => p.id).join(',');
        const cr = await fetch(
          `${supabaseUrl}/rest/v1/community_comments?post_id=in.(${ids})&select=id,post_id,idol_id,content,is_reply,reply_to_comment_id,created_at&order=created_at.asc&limit=500`,
          { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
        );
        if (cr.ok) {
          const rows = await cr.json();
          if (Array.isArray(rows)) {
            const map = {};
            rows.forEach(c => { if (!map[c.post_id]) map[c.post_id] = []; map[c.post_id].push(c); });
            posts = posts.map(p => ({ ...p, comments: map[p.id] || [] }));
          }
        }
      } catch (_) {}
    }

    return res.status(200).json({ posts });
  } catch (e) {
    return res.status(200).json({ posts: [] });
  }
}
