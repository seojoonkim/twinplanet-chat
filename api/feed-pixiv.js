export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

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
      // network timeout or fetch error — return empty
    }

    const validArtworks = artworks
      .filter(item => item.id && item.title && item.url)
      .slice(0, 20);

    const posts = validArtworks.map(item => {
      // Replace i.pximg.net with i.pixiv.cat to bypass Referer restriction
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

    return res.status(200).json({ posts });
  } catch (err) {
    console.error('[feed-pixiv] fatal:', err?.message);
    return res.status(200).json({ posts: [] });
  }
}
