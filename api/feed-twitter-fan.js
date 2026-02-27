export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  const BEARER = (process.env.TWITTER_BEARER_TOKEN || '').trim();
  if (!BEARER) return res.status(200).json({ posts: [] });

  const cleanEnv = s => (s || '').replace(/\\n/g, '').trim();
  const supabaseUrl = cleanEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const supabaseKey = cleanEnv(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);

  try {
    const query = encodeURIComponent('#新しい学校のリーダーズ OR #ATARASHIIGAKKO -is:retweet');
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=20&tweet.fields=created_at,text,attachments,public_metrics,author_id,entities&expansions=attachments.media_keys,author_id&media.fields=url,preview_image_url,type&user.fields=name,username,profile_image_url`;

    let tweets = [], users = [], media = [];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${BEARER}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        tweets = data.data || [];
        users = data.includes?.users || [];
        media = data.includes?.media || [];
      }
      // 401/403/429 등 에러는 빈 배열로 처리 (크래시 없음)
    } catch (_) {
      // network timeout 등 — 빈 배열 반환
    }

    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });
    const mediaMap = {};
    media.forEach(m => { mediaMap[m.media_key] = m; });

    // Batch-fetch comments (tweet이 있을 때만)
    let commentsMap = {};
    if (supabaseUrl && supabaseKey && tweets.length > 0) {
      try {
        const ids = tweets.map(t => t.id).join(',');
        const commentsUrl = `${supabaseUrl}/rest/v1/community_comments?post_id=in.(${ids})&select=id,post_id,idol_id,content,is_reply,reply_to_comment_id,created_at&order=created_at.asc&limit=500`;
        const cr = await fetch(commentsUrl, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        if (cr.ok) {
          const rows = await cr.json();
          if (Array.isArray(rows)) {
            rows.forEach(c => {
              if (!commentsMap[c.post_id]) commentsMap[c.post_id] = [];
              commentsMap[c.post_id].push(c);
            });
          }
        }
      } catch (_) { /* comments 실패 무시 */ }
    }

    const posts = tweets.map(tweet => {
      const author = userMap[tweet.author_id] || {};
      const mediaKeys = tweet.attachments?.media_keys || [];
      const images = mediaKeys.map(k => mediaMap[k]?.url || mediaMap[k]?.preview_image_url).filter(Boolean);

      return {
        id: tweet.id,
        source: 'twitter',
        url: `https://x.com/${author.username || 'unknown'}/status/${tweet.id}`,
        title: '',
        content: tweet.text || '',
        imageUrl: images[0] || null,
        images,
        date: tweet.created_at || new Date().toISOString(),
        likes: tweet.public_metrics?.like_count || 0,
        replies: tweet.public_metrics?.retweet_count || 0,
        authorName: author.name || author.username || 'fan',
        authorAvatarUrl: author.profile_image_url || null,
        topComments: [],
        comments: commentsMap[tweet.id] || [],
      };
    });

    // 댓글 없는 트윗 감지 시 GitHub Actions 트리거 (fire & forget)
    const emptyCommentPosts = posts.filter(p => (p.comments || []).length === 0);
    if (emptyCommentPosts.length > 0) {
      const githubPat = cleanEnv(process.env.GITHUB_PAT);
      if (githubPat) {
        fetch(
          'https://api.github.com/repos/seojoonkim/twinplanet-chat/actions/workflows/community-comments.yml/dispatches',
          {
            method: 'POST',
            headers: {
              'Authorization': `token ${githubPat}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({ ref: 'main' }),
          }
        ).catch(() => {}); // fire and forget, 절대 응답 기다리지 않음
      }
    }

    // 댓글 없는 트윗에 즉시 댓글 생성 (병렬, fire-and-forget 아님 — 완료 후 반환)
    const OPENROUTER_KEY = cleanEnv(process.env.OPENROUTER_API_KEY);
    const supabaseServiceKey = cleanEnv(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (OPENROUTER_KEY && supabaseServiceKey && supabaseUrl && posts.length > 0) {
      const emptyPosts = posts.filter(p => (p.comments || []).length === 0).slice(0, 5); // 최대 5개만 처리 (타임아웃 방지)

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

        // 태그 기반 멤버 선택
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
          // 무작위 선택
          return MEMBER_POOL[Math.floor(Math.random() * MEMBER_POOL.length)];
        }

        async function genComment(post) {
          const member = pickCommenter(post.content || '');
          const systemPrompt = `あなたはTWIN PLANETタレント ${member.name}です。ファンの投稿に短いコメントを日本語で残してください。1〜2文、絵文字1個、自然な反応。`;
          const userPrompt = `ファンの投稿: ${(post.content || '').slice(0, 120)}\n\n${member.name}のコメント:`;

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
            const insertUrl = `${supabaseUrl}/rest/v1/community_comments`;
            await fetch(insertUrl, {
              method: 'POST',
              headers: { 'apikey': supabaseServiceKey, 'Authorization': `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
              body: JSON.stringify({ post_id: post.id, idol_id: member.id, content: text, is_reply: false }),
            });

            return { idol_id: member.id, content: text };
          } catch { return null; }
        }

        // 병렬로 최대 5개 처리 (Promise.allSettled)
        const results = await Promise.allSettled(emptyPosts.map(p => genComment(p)));

        // 생성된 댓글을 posts 배열에 반영
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
    console.error('[feed-twitter-fan] fatal:', err?.message);
    return res.status(200).json({ posts: [] });
  }
}
