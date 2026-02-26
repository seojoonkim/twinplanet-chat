import { useEffect, useMemo, useRef, useState } from 'react';

function proxyImg(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes('dcimg')) return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  return url;
}

const YT_RE = /(?:youtu\.be\/|(?:www\.)?youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|i\.ytimg\.com\/vi\/)([A-Za-z0-9_-]{11})/;

function extractYouTubeId(text: string): string | null {
  const m = text.match(YT_RE);
  return m ? (m[1] ?? null) : null;
}

function stripUrls(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/youtu\.be\S*/g, '')
    .trim();
}

type Source = 'theqoo' | 'twitter' | 'dcinside';
type SourceFilter = 'all' | Source;

type CommunityItem = {
  id: string;
  source: Source;
  sourceLabel?: string;
  url: string;
  title: string;
  content: string;
  imageUrl: string | null;
  images?: string[];
  youtubeUrl?: string;
  date: string;
  likes: number;
  replies: number;
  authorName?: string;
  topComments?: string[];
  comments?: CommunityComment[];
};

type CommunityFeed = {
  updatedAt: string;
  items: CommunityItem[];
};

type CommunityComment = {
  id: string;
  idol_id: string;
  content: string;
  is_reply: boolean;
  reply_to_comment_id: string | null;
  created_at: string;
};

function kstDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return { month: map.month || '', day: map.day || '' };
}

function formatDateLabel(iso: string) {
  const targetTs = new Date(iso).getTime();
  if (Number.isNaN(targetTs)) return '';

  const nowTs = Date.now();
  const diffMs = nowTs - targetTs;
  if (diffMs < 60 * 1000) return '방금';

  const minute = Math.floor(diffMs / (1000 * 60));
  if (minute < 60) return `${minute}분 전`;

  const hour = Math.floor(diffMs / (1000 * 60 * 60));
  if (hour < 24) return `${hour}시간 전`;

  const day = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (day < 7) return `${day}일 전`;

  const dt = new Date(targetTs);
  const parts = kstDateParts(dt);
  return `${parts.month}월 ${parts.day}일`;
}

const cardShadow = { boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06), 0 2px 8px -2px rgba(0,0,0,0.04)' };

function CommunitySkeleton() {
  return (
    <div className="bg-white rounded-xl mb-3 overflow-hidden" style={cardShadow}>
      <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-2.5">
        <div className="w-10 h-10 rounded-full skeleton-shimmer" />
        <div className="flex-1 min-w-0">
          <div className="h-4 w-28 rounded-full skeleton-shimmer" />
          <div className="mt-1.5 h-3 w-16 rounded-full skeleton-shimmer" />
        </div>
      </div>

      <div className="px-3.5 pb-2.5">
        <div className="h-4 w-10/12 rounded-full skeleton-shimmer" />
        <div className="mt-1.5 h-3 w-full rounded-full skeleton-shimmer" />
        <div className="mt-1 h-3 w-11/12 rounded-full skeleton-shimmer" />
      </div>

      <div className="h-px bg-gray-100 mx-3.5" />

      <div className="flex items-center justify-between px-3.5 py-1.5">
        <div className="h-3 w-12 rounded-full skeleton-shimmer" />
        <div className="h-3 w-14 rounded-full skeleton-shimmer" />
      </div>

      <div className="h-px bg-gray-100 mx-3.5" />

      <div className="flex items-center px-1 py-0.5">
        <div className="flex-1 h-9 rounded-lg mx-0.5 skeleton-shimmer" />
        <div className="flex-1 h-9 rounded-lg mx-0.5 skeleton-shimmer" />
        <div className="flex-1 h-9 rounded-lg mx-0.5 skeleton-shimmer" />
      </div>
    </div>
  );
}

const SOURCE_ICON_BG: Record<Source, string> = {
  theqoo:   'linear-gradient(135deg,#7C3AED,#a855f7)',
  dcinside: 'linear-gradient(135deg,#E81111,#f87171)',
  twitter:  'linear-gradient(135deg,#000,#374151)',
};
const SOURCE_ICON_LABEL: Record<Source, string> = {
  theqoo:   '더쿠',
  dcinside: '디씨',
  twitter:  '𝕏',
};

const COMMUNITY_LINK_LABELS: Record<Source, string> = {
  theqoo: 'View on Theqoo →',
  dcinside: 'View on DCInside →',
  twitter: '𝕏 View on Twitter →',
};

const COMMUNITY_LINK_COLORS: Record<Source, string> = {
  theqoo: '#7C3AED',
  dcinside: '#E81111',
  twitter: '#000000',
};

const MEMBER_KEYWORDS: Record<string, string[]> = {
  mizyu:    ['MIZYU', 'ミジュ', 'mizyu', '미쥬', 'ミジュコプター'],
  rin:      ['RIN', 'りん', 'rin', '린'],
  suzuka:   ['SUZUKA', 'スズカ', 'suzuka', '스즈카'],
  kanon:    ['KANON', 'かのん', 'kanon', '카논'],
  nako:     ['奈子', '矢吹奈子', 'nako', 'なこ', '나코', '야부키나코'],
  nana:     ['奈々', '鈴木奈々', 'nana', 'なな', '나나', '스즈키나나'],
  taiyo:    ['太陽', '杉浦太陽', 'taiyo', 'たいよう', '타이요', '스기우라타이요'],
  yoshiaki: ['よしあき', 'yoshiaki', '요시아키', 'ONSENSE'],
  michi:    ['ミチ', 'michi', '미치', 'よしミチ'],
  jbk:      ['정병기', '병기', '병기형', '제이든', '병기햄', 'jbk', 'JBK', 'Jayden'],
};

// 그룹 별칭 → 멤버 ID 배열
const GROUP_KEYWORDS: Array<{ keywords: string[]; members: string[] }> = [
  { keywords: ['AG!', 'ATARASHII GAKKO', '新しい学校', '신학교리더즈'], members: ['mizyu', 'rin', 'suzuka', 'kanon'] },
  { keywords: ['트윈플래닛', 'twinplanet', 'twin planet', 'TWIN PLANET'], members: ['nako', 'nana', 'taiyo', 'yoshiaki', 'michi'] },
];

const MEMBER_NAME: Record<string, string> = {
  mizyu: 'MIZYU', rin: 'RIN', suzuka: 'SUZUKA', kanon: 'KANON',
  nako: '奈子', nana: '奈々', taiyo: '太陽', yoshiaki: 'よしあき',
  michi: 'ミチ', jbk: '정병기',
};

function detectMemberTags(text: string): string[] {
  const found: string[] = [];
  // 설린 포함 텍스트에서 린 단독 매칭 방지
  const normalizedText = text
    .replace(/설린/g, 'SEOLLIN')
    .replace(/혜린/g, 'HYERIN');
  for (const [id, keywords] of Object.entries(MEMBER_KEYWORDS)) {
    const searchText = id === 'rin' ? normalizedText : text;
    if (keywords.some((kw) => searchText.includes(kw))) found.push(id);
  }
  // 그룹 키워드 처리
  for (const group of GROUP_KEYWORDS) {
    if (group.keywords.some(kw => text.includes(kw))) {
      for (const memberId of group.members) {
        if (!found.includes(memberId)) found.push(memberId);
      }
    }
  }
  return found.length > 0 ? found : ['all'];
}

function CommunityCard({ item }: { item: CommunityItem }) {
  const comments: CommunityComment[] = item.comments || [];

  const ytId = extractYouTubeId(item.youtubeUrl || '')
    || extractYouTubeId(item.content || '')
    || extractYouTubeId(item.title || '')
    || (item.images || []).reduce<string | null>((acc, img) => acc || extractYouTubeId(img), null);
  const cleanContent = stripUrls(item.content || '');
  const displayName = item.authorName || item.sourceLabel;
  const memberTags = detectMemberTags(
    (item.title || '') + ' ' + (item.content || '') + ' ' + (item.authorName || '') + ' ' + (item.topComments || []).join(' ')
  ).filter(t => t !== 'all');

  return (
    <div className="bg-white rounded-xl mb-3 overflow-hidden" style={cardShadow}>
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-2.5">
        <div
          className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-[11px]"
          style={{ background: SOURCE_ICON_BG[item.source] }}
        >
          {SOURCE_ICON_LABEL[item.source]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] text-gray-900 leading-tight truncate">{displayName}</p>
          <p className="text-[12px] text-gray-400 mt-0.5">{formatDateLabel(item.date)} · {item.sourceLabel || SOURCE_ICON_LABEL[item.source]}</p>
        </div>
      </div>

      {/* 본문 */}
      {(item.title || cleanContent) ? (
        <div className="px-3.5 pb-2.5">
          {item.title ? (
            <p className="font-bold text-[14px] text-gray-900 leading-snug">{item.title}</p>
          ) : null}
          {cleanContent ? (
            <p className={`text-[15px] text-gray-700 leading-relaxed line-clamp-5 whitespace-pre-line${item.title ? ' mt-1' : ''}`}>
              {cleanContent}
            </p>
          ) : null}
          {item.topComments?.length ? (
            <div className="px-3.5 pb-1">
              <div className="h-px bg-gray-100 mb-2" />
              {item.topComments.map((comment, idx) => (
                <p key={idx} className="text-[12px] text-gray-500">
                  └ {comment}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 멤버 태그 */}
      {memberTags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3.5 pb-3 pt-1">
          {memberTags.slice(0, 6).map(id => (
            <span
              key={id}
              className="text-[11px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5"
            >
              {MEMBER_NAME[id] ?? id}
            </span>
          ))}
        </div>
      )}

      {/* 이미지 (YouTube 유무와 무관하게 항상 표시) */}
      {(item.images?.length || item.imageUrl) ? (() => {
          const imgs: string[] = (item.images && item.images.length > 0 ? item.images : (item.imageUrl ? [item.imageUrl] : []))
            .filter(img => !img.includes('ytimg.com'));
          const gridClass =
            imgs.length === 1 ? '' :
            imgs.length === 2 ? 'grid grid-cols-2 gap-0.5' :
            imgs.length === 3 ? 'grid grid-cols-3 gap-0.5' :
            'grid grid-cols-2 gap-0.5';
          return (
            <div className={`w-full overflow-hidden bg-gray-100 ${gridClass}`}>
              {imgs.slice(0, 4).map((url, idx) => {
                const proxied = proxyImg(url);
                if (!proxied) return null;
                return (
                  <img
                    key={idx}
                    src={proxied}
                    alt=""
                    className={`w-full object-cover ${imgs.length > 1 ? 'aspect-square' : ''}`}
                    style={imgs.length === 1 ? { maxHeight: '600px' } : undefined}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                );
              })}
            </div>
          );
        })() : null}

      {/* YouTube embed (이미지와 독립) */}
      {ytId ? (
        <div style={{ aspectRatio: '16/9' }}>
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      {/* 멤버 댓글 섹션 */}
      {comments.length > 0 && (
        <div className="px-3.5 pt-2 pb-1 border-t border-gray-100">
          {comments.filter(c => !c.is_reply).map(comment => (
            <div key={comment.id} className="flex items-start gap-2 py-1.5">
              <img
                src={comment.idol_id === 'jbk' ? '/jungbyeongki.jpg' : `/idols/${comment.idol_id}/profile.jpg`}
                className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[11px] font-bold text-gray-700">{MEMBER_NAME[comment.idol_id] ?? comment.idol_id}</span>
                </div>
                <p className="text-[13px] text-gray-700 leading-snug">{comment.content}</p>
                {/* 대댓글 */}
                {comments.filter(r => r.reply_to_comment_id === comment.id).map(reply => (
                  <div key={reply.id} className="flex items-start gap-2 mt-1.5 pl-2 border-l-2 border-violet-100">
                    <img
                      src={reply.idol_id === 'jbk' ? '/jungbyeongki.jpg' : `/idols/${reply.idol_id}/profile.jpg`}
                      className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-0.5"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div>
                      <span className="text-[10px] font-bold text-gray-600 mr-1">{MEMBER_NAME[reply.idol_id] ?? reply.idol_id}</span>
                      <span className="text-[12px] text-gray-600">{reply.content}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 원문 보기 링크 */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-3.5 py-2 text-sm font-semibold"
        style={{ color: COMMUNITY_LINK_COLORS[item.source] }}
      >
        {COMMUNITY_LINK_LABELS[item.source]}
      </a>

      {/* 리액션 카운트 */}
      <div className="flex items-center justify-between px-3.5 py-1.5">
        <span className="text-[12px] text-gray-400">🤍 {item.likes.toLocaleString()}</span>
        <span className="text-[12px] text-gray-400">{item.replies} comments</span>
      </div>

      <div className="h-px bg-gray-100 mx-3.5" />

      {/* 액션 버튼 */}
      <div className="flex items-center px-1 py-0.5">
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-gray-50">
          🤍 좋아요
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-gray-50">
          💬 댓글
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-gray-500 hover:bg-gray-50"
        >
          ↗ 공유
        </button>
      </div>
    </div>
  );
}

function sourceFilterLabel(value: SourceFilter) {
  if (value === 'all') return 'ALL';
  if (value === 'theqoo') return 'Theqoo';
  if (value === 'twitter') return 'Twitter';
  return 'DCInside';
}

export default function CommunityPage() {
  const [items, setItems] = useState<CommunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [filterMember, setFilterMember] = useState<string>('');
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/community-feed');
        if (!res.ok) throw new Error('feed-not-found');
        const data = await res.json() as CommunityFeed;
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setFetchError('피드 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) {
        setSourceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredItems = useMemo(() => {
    const sourceFiltered = sourceFilter === 'all'
      ? items
      : items.filter((item) => item.source === sourceFilter);

    if (filterMember) {
      return sourceFiltered.filter((item) => {
        const tags = detectMemberTags((item.title || '') + ' ' + (item.content || ''));
        return tags.includes(filterMember);
        // 주의: 'all' 태그는 필터 시 포함하지 않음 (멤버 선택 시 전체 태그 제외)
      });
    }

    return sourceFiltered;
  }, [items, sourceFilter, filterMember]);

  const memberOptions = [
    { id: 'mizyu',    name: 'MIZYU',   sNumber: 1 },
    { id: 'rin',      name: 'RIN',     sNumber: 2 },
    { id: 'suzuka',   name: 'SUZUKA',  sNumber: 3 },
    { id: 'kanon',    name: 'KANON',   sNumber: 4 },
    { id: 'nako',     name: '奈子',    sNumber: 5 },
    { id: 'nana',     name: '奈々',    sNumber: 6 },
    { id: 'taiyo',    name: '太陽',    sNumber: 7 },
    { id: 'yoshiaki', name: 'よしあき', sNumber: 8 },
    { id: 'michi',    name: 'ミチ',    sNumber: 9 },
  ];

  return (
    <div className="pb-24">
      <div
        className="px-4 pt-4 pb-3 border-b border-violet-200 mb-4 flex items-center justify-between gap-2 rounded-xl"
        style={{ background: '#F5F3FF' }}
      >
        <h1 className="text-sm font-normal text-gray-900 shrink-0">FANDOM RADAR 📡</h1>
        <div className="flex gap-2 shrink-0">
          <div ref={sourceDropdownRef} className="relative">
            <button
              onClick={() => setSourceDropdownOpen(o => !o)}
              className="flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-1 hover:bg-violet-100 transition-colors whitespace-nowrap"
            >
              {sourceFilter === 'all' ? 'SOURCE' : sourceFilterLabel(sourceFilter)}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: sourceDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {sourceDropdownOpen && (
              <div
                className="absolute top-full right-0 mt-1.5 bg-white rounded-2xl z-50 p-3"
                style={{ boxShadow: '0 8px 32px -4px rgba(0,0,0,0.14)', width: '252px' }}
              >
                {(['all', 'theqoo', 'dcinside', 'twitter'] as SourceFilter[]).map(value => (
                  <button
                    key={value}
                    onClick={() => { setSourceFilter(value); setSourceDropdownOpen(false); }}
                    className={`w-full text-left text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors mb-1.5 last:mb-0 ${sourceFilter === value ? 'bg-violet-100 text-violet-700' : 'text-gray-600 hover:bg-violet-50'}`}
                  >
                    {sourceFilterLabel(value)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-1 hover:bg-violet-100 transition-colors whitespace-nowrap"
            >
              {filterMember
                ? (memberOptions.find((m) => m.id === filterMember)?.name ?? 'ALL')
                : 'ALL'}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {dropdownOpen && (
              <div
                className="absolute top-full right-0 mt-1.5 bg-white rounded-2xl z-50 p-3"
                style={{ boxShadow: '0 8px 32px -4px rgba(0,0,0,0.14)', width: '252px' }}
              >
                <button
                  onClick={() => { setFilterMember(''); setDropdownOpen(false); }}
                  className={`w-full text-left text-sm font-semibold px-3 py-1.5 rounded-lg mb-2 transition-colors ${!filterMember ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-violet-50'}`}
                >
                  ✓ ALL
                </button>
                <div className="grid grid-cols-3 gap-1">
                  {memberOptions.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setFilterMember(m.id); setDropdownOpen(false); }}
                      className={`flex flex-col items-center py-1.5 px-1 rounded-lg transition-colors ${filterMember === m.id ? 'bg-violet-100 text-violet-700' : 'text-gray-600 hover:bg-violet-50'}`}
                    >
                      <span className="text-[10px] text-gray-400 leading-none mb-0.5">S{m.sNumber}</span>
                      <span className="text-[13px] font-semibold leading-none">{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <>
          <CommunitySkeleton />
          <CommunitySkeleton />
          <CommunitySkeleton />
        </>
      ) : fetchError ? (
        <div className="mx-4 text-sm text-gray-500 py-8 text-center">{fetchError}</div>
      ) : filteredItems.length === 0 ? (
        <div className="mx-4 text-sm text-gray-500 py-8 text-center">No posts in the last 7 days.</div>
      ) : (
        filteredItems.map(item => (
          <CommunityCard key={item.id} item={item} />
        ))
      )}
    </div>
  );
}
