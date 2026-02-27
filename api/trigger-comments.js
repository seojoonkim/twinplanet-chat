// Vercel API wrapper: cron-job.org → GitHub Actions dispatch
// cron-job.org는 custom headers를 지원하지 않으므로 이 엔드포인트가 PAT를 관리
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const githubPat = (process.env.GITHUB_PAT || '').trim();
  if (!githubPat) {
    return res.status(500).json({ error: 'GITHUB_PAT not configured' });
  }

  try {
    const response = await fetch(
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
    );

    if (response.status === 204) {
      return res.status(200).json({ ok: true, triggered: true });
    } else {
      const text = await response.text();
      return res.status(200).json({ ok: false, status: response.status, body: text });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
