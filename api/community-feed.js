export default async function handler(req, res) {
  try {
    const ghToken = process.env.GITHUB_TOKEN;
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

    // 1. GitHub에서 최신 feed 가져오기
    const feedUrl = 'https://raw.githubusercontent.com/seojoonkim/triples-chat/main/public/community-feed.json';
    const feedHeaders = { 'Cache-Control': 'no-cache' };
    if (ghToken) feedHeaders['Authorization'] = `token ${ghToken}`;
    const feedRes = await fetch(feedUrl, { headers: feedHeaders });
    if (!feedRes.ok) throw new Error('GitHub feed fetch failed: ' + feedRes.status);
    const feedData = await feedRes.json();

    // 2. Supabase에서 모든 댓글 가져오기
    let commentsMap = {};
    if (supabaseUrl && supabaseKey) {
      try {
        const commentsUrl = `${supabaseUrl}/rest/v1/community_comments?select=id,post_id,idol_id,content,is_reply,reply_to_comment_id,created_at&order=created_at.asc&limit=2000`;
        const commentsRes = await fetch(commentsUrl, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
        });
        if (commentsRes.ok) {
          const allComments = await commentsRes.json();
          // post_id별로 그룹핑
          for (const c of allComments) {
            if (!commentsMap[c.post_id]) commentsMap[c.post_id] = [];
            commentsMap[c.post_id].push(c);
          }
        }
      } catch (e) { /* comments 실패해도 feed는 반환 */ }
    }

    // 3. feed items에 comments 주입
    const items = (feedData.items || []).map(item => ({
      ...item,
      comments: commentsMap[item.id] || []
    }));

    res.setHeader('Cache-Control', 'no-store, no-cache');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ ...feedData, items });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
