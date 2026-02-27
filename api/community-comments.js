export default async function handler(req, res) {
  const { post_id } = req.query;
  if (!post_id) return res.status(400).json({ error: 'post_id required' });

  const supabaseUrl = ( process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_KEY || '').trim();
  const anonKey = ( process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  const key = serviceKey || anonKey;

  if (!supabaseUrl || !key) {
    return res.status(500).json({ error: 'Supabase not configured', comments: [] });
  }

  try {
    const url = `${supabaseUrl}/rest/v1/community_comments?post_id=eq.${encodeURIComponent(post_id)}&select=id,idol_id,content,is_reply,reply_to_comment_id,created_at&order=created_at.asc`;
    const response = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      }
    });
    if (!response.ok) throw new Error(`Supabase error: ${response.status}`);
    const comments = await response.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ comments });
  } catch (e) {
    return res.status(500).json({ error: e.message, comments: [] });
  }
}
