export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const cleanEnv = s => (s || '').replace(/\\n/g, '').trim();
  const supabaseUrl = cleanEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const supabaseKey = cleanEnv(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const OPENROUTER_KEY = cleanEnv(process.env.OPENROUTER_API_KEY);
  const supabaseServiceKey = cleanEnv(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const tag = encodeURIComponent('新しい学校のリーダーズ');
    const url = `https://www.pixiv.net/ajax/search/artworks/${tag}?word=${tag}&order=date_d&mode=all&p=1&s_mode=s_tag&type=illust_and_ugoira&lang=ja`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    let artworks = [];
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.pixiv.net/',
          'Accept': 'application/json',
          'Accept-Language': 'ja,en;q=0.9',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        artworks = data?.body?.illustManga?.data || [];
      }
    } catch (_) {
      clearTimeout(timeout);
    }

    const validArtworks = artworks
      .filter(item => item.id && item.title && item.url)
      .slice(0, 20);

    let posts = validArtworks.map(item => {
      const rawThumb = item.url || '';
      const imageUrl = rawThumb
        ? rawThumb.replace('i.pximg.net', 'i.pixiv.cat')
        : null;

      const title = item.title || '';
      const userName = item.userName || '';
      const id = String(item.id || '');

      return {
        id: `artwork_${id}`,
        source: 'pixiv',
        url: `https://www.pixiv.net/artworks/${id}`,
        title: title,
        content: userName ? `${title}  —  ${userName}` : title,
        imageUrl: imageUrl,
        images: imageUrl ? [imageUrl] : [],
        date: item.createDate || new Date().toISOString(),
        likes: item.bookmarkCount || 0,
        replies: 0,
        authorName: userName,
        topComments: [],
        comments: [],
      };
    });

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
          const systemPrompt = `あなたはTWIN PLANETタレント ${member.name}です。ファンのPixivイラストに短いコメントを日本語で残してください。1〜2文、絵文字1個、自然な反応。`;
          const userPrompt = `ファンのPixivイラスト: 「${(post.title || '').slice(0, 80)}」 by ${post.authorName || 'ファン'}\n\n${member.name}のコメント:`;

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
  } catch (err) {
    console.error('[feed-pixiv] fatal:', err?.message);
    return res.status(200).json({ posts: [] });
  }
}
