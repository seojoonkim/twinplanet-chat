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
        // Extract unique article ID from Google News URL (e.g. /articles/CBMi...)
        // Using base64(link) was broken: all GNews URLs share same 16-char prefix
        id: (() => {
          const m = link.match(/\/articles\/([A-Za-z0-9_-]{8,})/);
          return m ? `togetter_${m[1].slice(0, 24)}` : `togetter_${Buffer.from(link).toString('base64').slice(16, 40)}`;
        })(),
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

  const cleanEnv = s => (s || '').replace(/\\n/g, '').trim();
  const supabaseUrl = cleanEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const supabaseKey = cleanEnv(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const OPENROUTER_KEY = cleanEnv(process.env.OPENROUTER_API_KEY);
  const supabaseServiceKey = cleanEnv(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

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

    // ── Batch-fetch comments from Supabase ─────────────────────────────────────
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

    // ── Instant comment generation for posts with 0 comments ──────────────────
    if (OPENROUTER_KEY && supabaseServiceKey && supabaseUrl && posts.length > 0) {
      const emptyPosts = posts.filter(p => (p.comments || []).length === 0).slice(0, 5);

      if (emptyPosts.length > 0) {
        const MEMBER_POOL = [
          { id: 'mizyu', name: 'MIZYU' },
          { id: 'rin', name: 'RIN' },
          { id: 'suzuka', name: 'SUZUKA' },
          { id: 'kanon', name: 'KANON' },
          { id: 'nako', name: '矢吹奈子' },
          { id: 'nana', name: '鈴木奈々' },
          { id: 'michi', name: 'ミチ' },
          { id: 'yoshiaki', name: 'よしあき' },
        ];

        function pickCommenter(text) {
          const lower = text.toLowerCase();
          if (lower.includes('mizyu') || lower.includes('みずゆ')) return MEMBER_POOL[0];
          if (lower.includes(' rin') || lower.includes('りん')) return MEMBER_POOL[1];
          if (lower.includes('suzuka') || lower.includes('すずか')) return MEMBER_POOL[2];
          if (lower.includes('kanon') || lower.includes('かのん')) return MEMBER_POOL[3];
          if (lower.includes('奈子') || lower.includes('矢吹')) return MEMBER_POOL[4];
          if (lower.includes('奈々') || lower.includes('鈴木')) return MEMBER_POOL[5];
          if (lower.includes('michi') || lower.includes('ミチ')) return MEMBER_POOL[6];
          if (lower.includes('よしあき') || lower.includes('yoshiaki')) return MEMBER_POOL[7];
          return MEMBER_POOL[Math.floor(Math.random() * MEMBER_POOL.length)];
        }

        async function genComment(post) {
          const member = pickCommenter((post.title || '') + ' ' + (post.content || ''));
          const systemPrompt = `あなたはTWIN PLANETタレント ${member.name}です。ニュース記事に短いコメントを日本語で残してください。1〜2文、絵文字1個、自然な反応。`;
          const userPrompt = `ニュース: 「${(post.title || '').slice(0, 100)}」\n\n${member.name}のコメント:`;

          try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 5000);
            const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: 'openai/gpt-4o-mini', max_tokens: 80, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }),
              signal: ctrl.signal,
            });
            clearTimeout(t);
            if (!r.ok) return null;
            const d = await r.json();
            const text = d.choices?.[0]?.message?.content?.trim();
            if (!text) return null;

            // Supabase INSERT
            await fetch(`${supabaseUrl}/rest/v1/community_comments`, {
              method: 'POST',
              headers: { 'apikey': supabaseServiceKey, 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
              body: JSON.stringify({ post_id: post.id, idol_id: member.id, content: text, is_reply: false }),
            });

            return { idol_id: member.id, content: text };
          } catch { return null; }
        }

        const results = await Promise.allSettled(emptyPosts.map(p => genComment(p)));

        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value) {
            const post = posts.find(p => p.id === emptyPosts[i].id);
            if (post) post.comments = [r.value];
          }
        });
      }
    }

    return res.status(200).json({ posts });
  } catch (e) {
    return res.status(200).json({ posts: [] });
  }
}
