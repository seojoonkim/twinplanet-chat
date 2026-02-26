const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const THEQOO_URL = 'https://theqoo.net/triples';
const THEQOO_PAGES = 3;
const THEQOO_LIST_LIMIT = 100;
const THEQOO_DETAIL_LIMIT = 30;
const THEQOO_DETAIL_BATCH_SIZE = 5;
const THEQOO_DETAIL_BATCH_DELAY_MS = 200;
const THEQOO_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
const THEQOO_REFERER = 'https://theqoo.net/';

const TWITTER_ENDPOINT = 'https://api.twitter.com/2/tweets/search/recent';
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const TWITTER_QUERY = '(#tripleS OR 트리플에스 OR tripleS) -is:retweet lang:ko';
const DCINSIDE_PAGES = 3;
const DCINSIDE_DELAY_MS = 300;
const DCINSIDE_GALLERY_IDS = ['triplescosmos', 'triplesss'];
const DC_DETAIL_LIMIT = 999; // 전체 상세 fetch
const DC_DETAIL_BATCH = 10;
const DC_DETAIL_DELAY = 200;
const DCINSIDE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Referer: 'https://gall.dcinside.com/',
};

const OUTPUT = path.join(__dirname, '..', 'public', 'community-feed.json');
const DCINSIDE_DATA = path.join(__dirname, 'dcinside-posts.json');
const MAX_ITEMS = 400;
const DAY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function pad2(v) { return String(v).padStart(2, '0'); }
function cleanText(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
function trimText(v, max) {
  const text = cleanText(v);
  return text.length > max ? text.slice(0, max) : text;
}
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function getKstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return {
    year: Number(map.year), month: Number(map.month), day: Number(map.day),
    hour: Number(map.hour), minute: Number(map.minute), second: Number(map.second),
  };
}

function isRecent(timestamp, nowTs = Date.now()) {
  return nowTs - timestamp <= DAY_WINDOW_MS;
}

function loadDCinsidePosts() {
  try {
    const raw = JSON.parse(fs.readFileSync(DCINSIDE_DATA, 'utf-8'));
    const nowTs = Date.now();
    return raw
      .filter(item => {
        if (!item.date_full) return false;
        const ts = Date.parse(item.date_full.replace(' ', 'T') + '+09:00');
        return Number.isFinite(ts) && isRecent(ts, nowTs);
      })
      .map(item => {
        const ts = Date.parse(item.date_full.replace(' ', 'T') + '+09:00');
        return {
          id: 'dcinside_' + item.gallery_id + '_' + item.no,
          source: 'dcinside',
          sourceLabel: item.gallery_id === 'triplescosmos' ? 'DC 마이너갤' : 'DC 미니갤',
          url: item.url,
          title: item.title || '',
          content: (() => {
            // item.body가 HTML일 수 있으므로 <br>/<p>/<div> → \n 변환
            const rawBody = item.body || '';
            const bodyText = rawBody
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<\/p>/gi, '\n')
              .replace(/<\/div>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n');
            return bodyText;
          })(),
          imageUrl: null,
          date: new Date(ts).toISOString(),
          likes: item.recommends || 0,
          replies: item.comments || 0,
          authorName: item.nick || '',
          _ts: ts,
        };
      });
  } catch (e) {
    console.log('[DCinside] load error:', e.message);
    return [];
  }
}

function kstIsoFromTs(ts) {
  const p = getKstParts(new Date(ts));
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}+09:00`;
}

function kstIsoFromParts({ year, month, day, hour = 0, minute = 0, second = 0 }) {
  const timestamp = Date.UTC(year, month - 1, day, hour - 9, minute, second);
  if (!Number.isFinite(timestamp)) return null;
  return { timestamp, iso: `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}+09:00` };
}

function toAbsoluteUrl(raw, baseUrl) {
  if (!raw) return null;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return null;
  }
}

function parseTheQooDate(raw, now) {
  const text = cleanText(raw).replace(/[()]/g, '');
  if (!text) return null;

  let match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (match) return kstIsoFromParts({ year: now.year, month: now.month, day: now.day, hour: Number(match[1]), minute: Number(match[2]) });

  match = text.match(/^(\d{2,4})[./](\d{1,2})[./](\d{1,2})$/);
  if (match) {
    let year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year <= 99) year += 2000;
    return kstIsoFromParts({ year, month, day });
  }

  match = text.match(/^(\d{1,2})[./](\d{1,2})$/);
  if (match) {
    let year = now.year;
    const month = Number(match[1]);
    const day = Number(match[2]);
    if (month > now.month || (month === now.month && day > now.day)) year -= 1;
    return kstIsoFromParts({ year, month, day });
  }
  return null;
}

function parseDcinsideDate(raw, nowTs = Date.now()) {
  const now = getKstParts(new Date(nowTs));
  const text = cleanText(raw);
  if (!text) return null;

  let match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    return kstIsoFromParts({
      year: now.year,
      month: now.month,
      day: now.day,
      hour: Number(match[1]),
      minute: Number(match[2]),
      second: Number(match[3] || 0),
    });
  }

  match = text.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    return kstIsoFromParts({
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4] || 0),
      minute: Number(match[5] || 0),
      second: Number(match[6] || 0),
    });
  }

  match = text.match(/^(\d{2})\.(\d{1,2})\.(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    return kstIsoFromParts({
      year: Number(match[1]) + 2000,
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4] || 0),
      minute: Number(match[5] || 0),
      second: Number(match[6] || 0),
    });
  }

  return null;
}

function dcinsideListUrl(galleryId, page) {
  return galleryId === 'triplescosmos'
    ? `https://gall.dcinside.com/mgallery/board/lists/?id=${galleryId}&page=${page}`
    : `https://gall.dcinside.com/mini/board/lists/?id=${galleryId}&page=${page}`;
}

function dcinsideViewUrl(galleryId, no) {
  return galleryId === 'triplescosmos'
    ? `https://gall.dcinside.com/mgallery/board/view/?id=${galleryId}&no=${no}`
    : `https://gall.dcinside.com/mini/board/view/?id=${galleryId}&no=${no}`;
}

function dcinsideSourceLabel(galleryId) {
  return galleryId === 'triplescosmos' ? 'DC 마이너갤' : 'DC 미니갤';
}

async function fetchDCinsidePostDetail(item) {
  const DC_NOISE_PATTERNS = [
    /타인의 권리를 침해하거나.{0,200}/g,
    /Shift\+Enter.{0,100}/g,
    /디시콘이란.{0,500}/g,
    /NFT 이벤트 획득법.{0,1000}/g,
    /등록\s*등록\+추천.{0,100}/g,
    /꿀팁!.{0,200}/g,
    /받으러 가기.{0,50}/g,
    /디시콘에서.{0,100}/g,
    /지갑연결시.{0,100}/g,
    /\s*-\s*dc official App\s*/gi,
  ];

  try {
    const res = await fetch(item.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer': 'https://gall.dcinside.com/',
      },
    });

    if (!res.ok) return { content: '', imageUrl: null };

    const html = await res.text();
    const $ = cheerio.load(html);
    const body = $('.write_div').first();

    // iframe(유튜브 embed 등) 텍스트 제거
    body.find('iframe, script, style').remove();
    // <br> 태그를 \n으로 변환 후 텍스트 추출
    body.find('br').replaceWith('\n');
    const ytAnchorHref = body.find('a[href*="youtu"]').first().attr('href') || null;
    let content = body.text();
    // Extract YouTube URL from anchor tags in DOM (before text extraction loses hrefs)
    const ytTextMatch = content.match(/https?:\/\/(?:youtu\.be\/|(?:www\.)?youtube\.com\/(?:watch\?v=|shorts\/|embed\/))[A-Za-z0-9_?=&_-]+/);
    const youtubeUrl = ytAnchorHref || (ytTextMatch ? ytTextMatch[0] : null);
    DC_NOISE_PATTERNS.forEach((pattern) => {
      content = content.replace(pattern, ' ');
    });
    // 모든 URL 제거
    content = content.replace(/https?:\/\/\S+/g, '');
    // youtu.be 잔재 제거
    content = content.replace(/youtu\.be\S*/g, '');
    // 줄바꿈은 보존하고 각 줄의 연속 공백만 정리
    content = content.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
    // 3줄 이상 연속 줄바꿈은 2줄로 제한
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.trim();
    if (content.length > 300) content = content.slice(0, 300);
    const imgEls = body.find('img').toArray();
    const rawImageSources = imgEls.map((el) => {
      const $el = $(el);
      return $el.attr('data-original') || $el.attr('data-lazy-src') || $el.attr('data-lazy') || $el.attr('data-src') || $el.attr('src') || '';
    });
    const imageUrls = rawImageSources
      .map((raw) => {
        if (!raw || raw.startsWith('data:')) return null;
        const normalized = raw.startsWith('//') ? `https:${raw}` : raw;
        const absolute = toAbsoluteUrl(normalized, item.url);
        if (!absolute || !absolute.startsWith('http')) return null;
        return absolute;
      })
      .filter(Boolean)
      .filter((url, idx, arr) => arr.indexOf(url) === idx);

    const imgs = imageUrls.filter(url => url.includes('dcinside'));
    const allImgs = imgs.length > 0 ? imgs : imageUrls.filter(url => url.startsWith('http'));
    const imageUrl = allImgs[0] || null;
    const replySource = cleanText($('.ct_in strong, .reply_num_box, .comment_area').first().text());
    const replyMatch = replySource.match(/(\d{1,5})/);
    const replies = replyMatch ? Number(replyMatch[1]) : undefined;

    return { content, imageUrl, images: allImgs, replies, topComments: [], youtubeUrl };
  } catch (e) {
    return { content: '', imageUrl: null, images: [], topComments: [] };
  }
}

async function fetchDCinsidePage(galleryId, pageNumber) {
  const url = dcinsideListUrl(galleryId, pageNumber);
  const res = await fetch(url, { headers: DCINSIDE_HEADERS });
  if (!res.ok) {
    throw new Error(`[DCinside] page ${pageNumber} (${galleryId}) failed: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const nowTs = Date.now();
  const items = [];

  $('tr.ub-content').each((_, row) => {
    const $row = $(row);
    const rowHtml = String($row.html() || '');
    if (/(icon_notice|icon_ad|icon_n_survey)/.test(rowHtml)) return;

    const noText = cleanText($row.find('.gall_num').first().text());
    if (!/^\d+$/.test(noText)) return;

    const titleAnchor = $row.find('.gall_tit a').first();
    if (!titleAnchor.length) return;
    const title = cleanText(titleAnchor.clone().find('.reply_num').remove().end().text());
    if (!title) return;

    const dateText = cleanText($row.find('.gall_date').first().attr('title') || $row.find('.gall_date').first().text());
    const parsed = parseDcinsideDate(dateText, nowTs);
    if (!parsed || !isRecent(parsed.timestamp, nowTs)) return;

    const writer = $row.find('.gall_writer').first();
    const nick = cleanText(writer.attr('data-nick') || writer.text());

    const recommendText = cleanText($row.find('.gall_recommend').first().text());
    const recommends = Number(recommendText.replace(/[^\d]/g, '')) || 0;
    const replyText = cleanText($row.find('.gall_reply_num').first().text());
    const comments = Number(replyText.replace(/[^\d]/g, '')) || 0;

    items.push({
      id: `dcinside_${galleryId}_${noText}`,
      source: 'dcinside',
      sourceLabel: dcinsideSourceLabel(galleryId),
      url: dcinsideViewUrl(galleryId, noText),
      title,
      content: '',
      images: [],
      imageUrl: null,
      date: parsed.iso,
      likes: recommends,
      replies: comments,
      authorName: nick,
      _ts: parsed.timestamp,
    });
  });

  console.log(`[DCinside] ${galleryId} page ${pageNumber}: ${items.length} items`);
  return items;
}

async function fetchDCinsidePosts() {
  try {
    const nowTs = Date.now();
    const deduped = new Map();

    for (const galleryId of DCINSIDE_GALLERY_IDS) {
      for (let pageNumber = 1; pageNumber <= DCINSIDE_PAGES; pageNumber += 1) {
        const rows = await fetchDCinsidePage(galleryId, pageNumber);
        for (const item of rows) {
          if (!item || !item.id || !isRecent(item._ts, nowTs)) continue;
          if (!deduped.has(item.id)) deduped.set(item.id, item);
        }
        if (pageNumber < DCINSIDE_PAGES) await delay(DCINSIDE_DELAY_MS);
      }
    }

    const allItems = Array.from(deduped.values()).sort((a, b) => b._ts - a._ts);

    const toFetch = allItems.slice(0, DC_DETAIL_LIMIT);
    const rest = allItems.slice(DC_DETAIL_LIMIT);

    for (let i = 0; i < toFetch.length; i += DC_DETAIL_BATCH) {
      const batch = toFetch.slice(i, i + DC_DETAIL_BATCH);
      const details = await Promise.all(batch.map(fetchDCinsidePostDetail));
    batch.forEach((item, idx) => {
      const detail = details[idx] || {};
      item.content = details[idx]?.content || '';
      item.images = detail.images || item.images || [];
      item.imageUrl = detail.imageUrl || item.imageUrl || item.images[0] || null;
      item.replies = typeof detail.replies === 'number' ? detail.replies : item.replies;
      item.topComments = detail.topComments || [];
    });

      if (i + DC_DETAIL_BATCH < toFetch.length) {
        await delay(DC_DETAIL_DELAY);
      }
    }

    return [...toFetch, ...rest];
  } catch (e) {
    console.log('[DCinside] live fetch failed, using cached data');
    return loadDCinsidePosts();
  }
}

function isPostHref(href = '') {
  if (!href || href.startsWith('javascript:') || href.startsWith('#')) return false;
  return /(?:^|\/)(?:square|triples|design|view)\/\d+/i.test(href);
}

function extractTheQooId(href) {
  const match = href.match(/(?:^|\/)(?:square|triples|design|view)\/(\d+)/i);
  return match ? match[1] : '';
}

async function fetchTheQooPage(pageNumber) {
  const res = await fetch(`${THEQOO_URL}?page=${pageNumber}`, { headers: { 'User-Agent': THEQOO_UA } });
  if (!res.ok) {
    console.log(`[theQoo] page ${pageNumber} failed:`, res.status);
    return [];
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const items = [];
  const nowParts = getKstParts();
  const nowTs = Date.now();

  $('tr').each((_, row) => {
    const $row = $(row);
    const anchors = $row.find('a[href]').filter((_, a) => {
      const href = ($(a).attr('href') || '').trim();
      const text = cleanText($(a).text());
      return isPostHref(href) && text.length >= 2 && !/^\d+$/.test(text);
    });
    if (!anchors.length) return;

    const $a = $(anchors[0]);
    const href = (() => { try { return new URL($a.attr('href') || '', 'https://theqoo.net').toString(); } catch { return ''; } })();
    if (!href) return;

    const id = extractTheQooId(href);
    if (!id) return;

    const title = cleanText($a.text());
    if (!title) return;

    let rawDate = '';
    const $cells = $row.children('td');
    if ($cells.length > 0) {
      const cells = $cells.toArray();
      const titleIdx = cells.indexOf($a.closest('td')[0]);
      if (titleIdx >= 0) {
        cells.slice(titleIdx + 1).forEach(cell => {
          const t = cleanText($(cell).text());
          if (!rawDate) {
            const m = t.match(/(\d{1,2}:\d{2}|\d{1,2}[./]\d{1,2}(?:[./]\d{1,2})?)/);
            if (m) rawDate = m[0];
          }
        });
      }
    }

    if (!rawDate) {
      const matches = cleanText($row.text()).match(/\d{1,2}:\d{2}|\d{1,2}[./]\d{1,2}(?:[./]\d{1,2})?/g) || [];
      rawDate = matches[matches.length - 1] || '';
    }

    const parsed = parseTheQooDate(rawDate, nowParts);
    if (!parsed || !isRecent(parsed.timestamp, nowTs)) return;

    items.push({
      id: `theqoo_${id}`,
      source: 'theqoo',
      sourceLabel: '더쿠',
      url: `https://theqoo.net/triples/${id}`,
      title,
      content: '',
      imageUrl: null,
      date: parsed.iso,
      likes: 0,
      replies: 0,
      authorName: '무명의 더쿠',
      _ts: parsed.timestamp,
    });
  });

  console.log('[theQoo] page ' + pageNumber + ': ' + items.length + ' items');

  return items;
}

async function fetchTheQooPostDetail(item) {
  try {
    const res = await fetch(item.url, {
      headers: { 'User-Agent': THEQOO_UA, Referer: THEQOO_REFERER },
    });
    if (!res.ok) {
      console.log(`[theQoo] detail failed: ${item.url} -> ${res.status}`);
      return { content: '', imageUrl: null };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const $body = $('.xe_content').first().length ? $('.xe_content').first() : $('.content').first();
    const content = trimText($body.text(), 500);
    const firstImg = $body.find('img').first();
    const imageUrl = toAbsoluteUrl(firstImg.attr('src') || '', item.url);
    const bodyAuthor = cleanText($('.author, .writer, .nick').first().text());
    const authorName = bodyAuthor || '무명의 더쿠';
    const dateMatch = html.match(/20\d\d[.\/\-]\d{2}[.\/\-]\d{2}\s+\d{2}:\d{2}/);
    let dateIso = null;
    if (dateMatch) {
      const normalized = dateMatch[0].replace(/[.\/]/g, '-').replace(' ', 'T') + ':00+09:00';
      const ts = Date.parse(normalized);
      if (Number.isFinite(ts)) dateIso = normalized;
    }
    const replyMatch = html.match(/댓글\s*(\d+)/i);
    const altReplyMatch = html.match(/(\d+)\s*개의?\s*댓글/i);
    const replyTextMatch = replyMatch || altReplyMatch;
    const replies = replyTextMatch ? Number(replyTextMatch[1]) : 0;
    const topComments = $('.fdb_itm .xe_content')
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter(Boolean)
      .slice(0, 3);

    return { content, imageUrl, dateIso, replies, authorName, topComments };
  } catch (e) {
    console.log('[theQoo] detail error:', e?.message || String(e));
    return { content: '', imageUrl: null, dateIso: null, replies: 0, authorName: '무명의 더쿠', topComments: [] };
  }
}

async function fetchTheQooPosts() {
  const pageIndexes = Array.from({ length: THEQOO_PAGES }, (_, i) => i + 1);
  const pages = await Promise.all(pageIndexes.map(fetchTheQooPage));
  const nowTs = Date.now();

  const deduped = new Map();
  const merged = pages.flat();
  for (const item of merged) {
    if (!item?.id || !isRecent(item._ts, nowTs) || deduped.has(item.id)) continue;
    deduped.set(item.id, item);
  }

  const ordered = Array.from(deduped.values()).sort((a, b) => b._ts - a._ts).slice(0, THEQOO_LIST_LIMIT);
  const targetCount = Math.min(THEQOO_DETAIL_LIMIT, ordered.length);
  const toFetch = ordered.slice(0, targetCount);
  const rest = ordered.slice(targetCount);

  for (let i = 0; i < toFetch.length; i += THEQOO_DETAIL_BATCH_SIZE) {
    const batch = toFetch.slice(i, i + THEQOO_DETAIL_BATCH_SIZE);
    const details = await Promise.all(batch.map(fetchTheQooPostDetail));
    batch.forEach((item, idx) => {
      const detail = details[idx] || {};
      item.content = details[idx]?.content || '';
      item.imageUrl = details[idx]?.imageUrl || null;
      item.replies = detail.replies;
      item.authorName = detail.authorName || item.authorName;
      item.topComments = detail.topComments || [];
      if (details[idx]?.dateIso) {
        const ts = Date.parse(details[idx].dateIso);
        if (Number.isFinite(ts)) {
          item.date = details[idx].dateIso;
          item._ts = ts;
        }
      }
    });

    if (i + THEQOO_DETAIL_BATCH_SIZE < toFetch.length) {
      await delay(THEQOO_DETAIL_BATCH_DELAY_MS);
    }
  }

  return [...toFetch, ...rest];
}

async function fetchTwitterPosts() {
  if (!TWITTER_BEARER_TOKEN) {
    console.log('[Twitter] No bearer token, skipping');
    return [];
  }
  try {
    const url = new URL(TWITTER_ENDPOINT);
    url.searchParams.set('query', TWITTER_QUERY);
    url.searchParams.set('sort_order', 'relevancy');
    url.searchParams.set('max_results', '100');
    url.searchParams.set('tweet.fields', 'created_at,text,public_metrics,author_id,attachments,possibly_sensitive');
    url.searchParams.set('expansions', 'author_id,attachments.media_keys');
    url.searchParams.set('user.fields', 'name,username');
    url.searchParams.set('media.fields', 'url,preview_image_url,type');

    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` } });
    if (!res.ok) {
      console.log('[Twitter] failed:', res.status, (await res.text()).slice(0, 200));
      return [];
    }

    const payload = await res.json();
    const nowTs = Date.now();
    const users = new Map((payload.includes?.users || []).map(u => [u.id, u]));
    const mediaMap = new Map((payload.includes?.media || []).map(m => [m.media_key, m]));

    return (payload.data || []).map(tweet => {
      const createdTs = Date.parse(tweet.created_at);
      if (!Number.isFinite(createdTs) || !isRecent(createdTs, nowTs)) return null;
      if (tweet.possibly_sensitive) return null; // 성인/민감 컨텐츠 제외
      const koreanChars = (tweet.text || '').match(/[가-힣]/g);
      if (!koreanChars || koreanChars.length < 3) return null; // 한글 3글자 미만 → 외국어 제외
      const user = users.get(tweet.author_id) || {};
      const raw = cleanText(tweet.text || '');
      const mediaKeys = tweet.attachments?.media_keys || [];
      const allMedia = mediaKeys.map(k => mediaMap.get(k)).filter(Boolean);
      const images = allMedia
        .filter(m => m.type === 'photo')
        .map(m => m.url || m.preview_image_url)
        .filter(Boolean);
      const imageUrl = images[0] || null;
      return {
        id: `twitter_${tweet.id}`,
        source: 'twitter',
        sourceLabel: '트위터',
        url: `https://x.com/i/web/status/${tweet.id}`,
        title: '',
        content: trimText(raw, 200),
        imageUrl,
        images,
        date: kstIsoFromTs(createdTs),
        likes: tweet.public_metrics?.like_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        authorName: user.username ? `@${user.username}` : '',
        _ts: createdTs,
      };
    }).filter(Boolean);
  } catch (e) {
    console.log('[Twitter] error:', e?.message || String(e));
    return [];
  }
}

async function main() {
  const [theQooPosts, twitterPosts, dcinsidePosts] = await Promise.all([fetchTheQooPosts(), fetchTwitterPosts(), fetchDCinsidePosts()]);
  const nowTs = Date.now();
  const merged = [...theQooPosts, ...twitterPosts, ...dcinsidePosts]
    .filter(item => item && isRecent(item._ts, nowTs))
    .sort((a, b) => b._ts - a._ts)
    .slice(0, MAX_ITEMS)
    .map(({ _ts, ...rest }) => rest);

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify({ updatedAt: kstIsoFromTs(nowTs), items: merged }, null, 2));
  console.log(`[Done] theQoo ${theQooPosts.length}, Twitter ${twitterPosts.length}, DCinside ${dcinsidePosts.length}, saved ${merged.length}`);
}

main().catch(err => { console.error('[Fatal]', err); process.exit(1); });
