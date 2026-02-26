/**
 * DCinside 이미지 프록시 — Referer 우회
 * /api/proxy-image?url=https://dcimg8.dcinside.co.kr/...
 */
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.startsWith('https://dcimg')) {
    return res.status(400).send('Invalid URL');
  }

  // Referer 체크 — twinplanet-chat 또는 localhost 외 출처 차단
  const referer = req.headers['referer'] || req.headers['origin'] || '';
  const isAllowed = !referer 
    || referer.includes('twinplanet-chat')
    || referer.includes('localhost')
    || referer.includes('127.0.0.1')
    || referer.includes('vercel.app');
  if (!isAllowed) {
    return res.status(403).send('Forbidden');
  }

  try {
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://gall.dcinside.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return res.status(response.status).send('Image fetch failed');
    }

    const buf = await response.arrayBuffer();
    const bytes = new Uint8Array(buf);

    // magic bytes로 실제 Content-Type 판별 (application/octet-stream 대응)
    let contentType = response.headers.get('content-type') || '';
    if (!contentType || contentType === 'application/octet-stream' || contentType.startsWith('application/')) {
      if (bytes[0] === 0xFF && bytes[1] === 0xD8) contentType = 'image/jpeg';
      else if (bytes[0] === 0x89 && bytes[1] === 0x50) contentType = 'image/png';
      else if (bytes[0] === 0x47 && bytes[1] === 0x49) contentType = 'image/gif';
      else if (bytes[0] === 0x52 && bytes[1] === 0x49) contentType = 'image/webp';
      else contentType = 'image/jpeg';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400');
    res.setHeader('Vercel-CDN-Cache-Control', 'max-age=604800');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).send('Proxy error');
  }
}
