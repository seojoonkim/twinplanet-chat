import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { DIARY_ENTRIES, DiaryEntry } from '../constants/diary-data';
import { ALL_MEMBERS } from '../constants/group-rooms';
import SiteFooter from '../components/SiteFooter';

function DiaryCard({ entry, onClick }: { entry: DiaryEntry; onClick: () => void }) {
  const imgSrc = entry.authorId === 'jbk'
    ? '/jungbyeongki.jpg'
    : `/idols/${entry.authorId}/profile.jpg`;

  const dateObj = new Date(entry.date);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const calYear = dateObj.getFullYear();
  const calMonth = months[dateObj.getMonth()];
  const calDay = dateObj.getDate();
  const calWeekday = weekdays[dateObj.getDay()];

  return (
    <button
      onClick={onClick}
      className="w-full text-left py-4 px-4 bg-white rounded-xl hover:bg-violet-50/60 transition-all active:bg-violet-100/80"
      style={{ boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06), 0 2px 8px -2px rgba(0,0,0,0.04)' }}
    >
      {/* 제목 — 풀 너비 */}
      <p
        className="font-black text-gray-800 w-full"
        style={{ fontFamily: "'Gowun Dodum', cursive", fontSize: '19px', lineHeight: '1.35' }}
      >
        {entry.title}
      </p>

      {/* 아바타+이름+미리보기 + 달력 뱃지 하단 정렬 */}
      <div className="flex items-end gap-2 mt-3">
        <div className="flex-1 min-w-0">
          {/* 얼굴 + 이름 */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={imgSrc}
                alt={entry.authorName}
                className="w-7 h-7 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-profile.jpg'; }}
              />
              <span className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none">{entry.mood}</span>
            </div>
            <span className="font-semibold text-gray-600 text-xs shrink-0" style={{ fontFamily: "'Gowun Dodum', cursive" }}>
              {entry.authorName}
            </span>
          </div>
          {/* 2줄 미리보기 */}
          <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {entry.content}
          </p>
        </div>

        {/* 달력 뱃지 — 작게 + 하단 정렬 */}
        <div className="shrink-0 flex flex-col rounded-xl overflow-hidden" style={{ width: '64px', height: '64px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06), 0 2px 8px -2px rgba(0,0,0,0.04)' }}>
          {/* Row 1: 연도 + 월 */}
          <div className="bg-violet-300 flex items-center justify-center gap-1" style={{ height: '24px' }}>
            <span className="text-white font-bold" style={{ fontSize: '9px' }}>{calYear}</span>
            <span className="text-white font-bold" style={{ fontSize: '9px' }}>{calMonth}</span>
          </div>
          {/* Row 2: 일 + 요일 */}
          <div className="flex-1 bg-white flex items-center justify-center gap-1">
            <span className="text-gray-600 font-black leading-none" style={{ fontSize: '22px' }}>{calDay}</span>
            <span className="text-gray-500 font-medium" style={{ fontSize: '9px' }}>{calWeekday}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// Feature B: 비밀 반전 공개
function SecretNote({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="mt-6">
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-pink-300 text-pink-500 text-sm font-medium hover:bg-pink-50 transition-colors"
        >
          🙈 비밀이 하나 더 있어요... (탭해서 확인)
        </button>
      ) : (
        <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200">
          <p className="text-sm text-pink-700 italic" style={{ fontFamily: 'Georgia, serif' }}>
            🤫 {text}
          </p>
        </div>
      )}
    </div>
  );
}

// Feature C: 공감 리액션
type ReactionKey = 'heart' | 'lol' | 'sad' | 'star';
const REACTIONS: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: 'heart', emoji: '❤️', label: 'Love' },
  { key: 'lol', emoji: '😂', label: 'ㅋㅋ' },
  { key: 'sad', emoji: '😢', label: 'Sad' },
  { key: 'star', emoji: '✨', label: 'Best' },
];

const ALL_IDOL_IDS = ['mizyu','rin','suzuka','kanon','nako','nana','taiyo','yoshiaki','michi'];

function memberImgSrc(id: string): string {
  return id === 'jbk' ? '/jungbyeongki.jpg' : `/idols/${id}/profile.jpg`;
}

function hashNum(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; }
  return Math.abs(h);
}

function getPresetReactions(entry: DiaryEntry): Record<ReactionKey, string[]> {
  // 전체 풀을 한 번만 셔플 → 각 반응에 순서대로 배분 (같은 멤버 중복 없음)
  const pool = ['jbk', ...ALL_IDOL_IDS].filter(id => id !== entry.authorId);
  const shuffled = [...pool].sort((a, b) => hashNum(entry.id + 'v2' + a) - hashNum(entry.id + 'v2' + b));
  const h = hashNum(entry.id);

  const heartCount = 4 + (h % 3);          // 4~6명
  const lolCount   = 2 + ((h >> 2) % 3);   // 2~4명
  const sadCount   = 1 + ((h >> 4) % 2);   // 1~2명
  const starCount  = 3 + ((h >> 6) % 3);   // 3~5명

  let i = 0;
  const heart = shuffled.slice(i, i + heartCount); i += heartCount;
  const lol   = shuffled.slice(i, i + lolCount);   i += lolCount;
  const sad   = shuffled.slice(i, i + sadCount);   i += sadCount;
  const star  = shuffled.slice(i, i + starCount);

  return { heart, lol, sad, star };
}

// 반응별 한마디 풀 (결정론적 할당)
const REACTION_COMMENTS: Record<ReactionKey, string[]> = {
  heart: ['공감 백퍼ㅠ', '나도 딱 이랬어', '이게 나야', '맞아맞아ㅠ', '완전 공감됨', '나 거의 울었잖아', '너무 공감돼서 저장함', '이게 맞지'],
  lol:   ['ㅋㅋㅋ진짜임?', '아 웃겨 죽겠다', '나 빵 터짐ㅋㅋ', '미쳤다ㅋㅋㅋ', '진짜야?ㅋㅋ', '읽다 웃음참음', '아ㅋㅋ 왜이래', '이게 말이 돼?ㅋㅋ'],
  sad:   ['나도 슬펐는데', '언니 괜찮아?', '마음이 아파...', '힘내!!', '슬프다ㅠ', '눈물 날 뻔', '같이 슬퍼ㅠ'],
  star:  ['역대급 일기!', '저장해뒀어', '최고야 진짜', '이게 맞지', '감동받았음', '완벽한 하루네', '진짜 좋은 글이다'],
};

function DiaryReactions({ entryId, entry }: { entryId: string; entry: DiaryEntry }) {
  // 단일 반응만 허용 (한 명 = 하나의 이모지만)
  const storageKey = `diary-single-reaction-${entryId}`;
  const preset = getPresetReactions(entry);

  const getMyReaction = (): ReactionKey | null => {
    try { return localStorage.getItem(storageKey) as ReactionKey | null; } catch { return null; }
  };
  const [myReaction, setMyReaction] = useState<ReactionKey | null>(getMyReaction);

  const handleReact = (key: ReactionKey) => {
    const next = myReaction === key ? null : key;
    setMyReaction(next);
    if (next) localStorage.setItem(storageKey, next);
    else localStorage.removeItem(storageKey);
  };

  const getMemberComment = (memberId: string, key: ReactionKey): string => {
    const pool = REACTION_COMMENTS[key];
    return pool[hashNum(memberId + entryId + key) % pool.length] ?? pool[0]!;
  };

  const getMemberName = (id: string): string => {
    if (id === 'jbk') return '정병기';
    return ALL_MEMBERS[id]?.name ?? id;
  };

  return (
    <div className="mt-6 mb-2 space-y-2.5">
      {REACTIONS.map(({ key, emoji, label }) => {
        const presetMembers = preset[key];
        const isMyKey = myReaction === key;
        const totalCount = presetMembers.length + (isMyKey ? 1 : 0);
        const commenters = presetMembers.slice(0, 2);
        const showAvatars = presetMembers; // 전원 표시

        return (
          <div
            key={key}
            className="rounded-2xl overflow-hidden transition-all"
            style={{
              background: isMyKey ? '#F5F3FF' : '#F9FAFB',
              border: isMyKey ? '1.5px solid #7C3AED' : '1.5px solid #E5E7EB',
            }}
          >
            {/* 메인 행 — 클릭해서 반응 */}
            <button className="w-full flex items-center gap-3 px-4 py-3" onClick={() => handleReact(key)}>
              <span className="text-2xl shrink-0">{emoji}</span>
              <span className="text-xs font-bold text-gray-400 w-8 shrink-0 text-left">{label}</span>
              {/* 아바타 오버랩 */}
              <div className="flex -space-x-1.5 flex-1">
                {showAvatars.map(id => (
                  <img
                    key={id}
                    src={memberImgSrc(id)}
                    alt={getMemberName(id)}
                    title={getMemberName(id)}
                    className="w-7 h-7 rounded-full border-2 border-white object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ))}
                {isMyKey && (
                  <div className="w-7 h-7 rounded-full bg-violet-500 border-2 border-white flex items-center justify-center text-[9px] text-white font-bold shrink-0">ME</div>
                )}
              </div>
              <span className="text-sm font-bold text-gray-600 shrink-0">{totalCount}</span>
            </button>

            {/* 한마디 — 프리셋 2명 + 내가 반응한 경우 나도 */}
            {(commenters.length > 0 || isMyKey) && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {commenters.map(id => (
                  <div key={id} className="flex items-center gap-2.5 px-4 py-2">
                    <img
                      src={memberImgSrc(id)}
                      alt={getMemberName(id)}
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="text-[11px] font-semibold text-gray-500 shrink-0">{getMemberName(id)}</span>
                    <span className="text-[11px] text-gray-400 italic truncate">"{getMemberComment(id, key)}"</span>
                  </div>
                ))}
                {isMyKey && (
                  <div className="flex items-center gap-2.5 px-4 py-2">
                    <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center text-[8px] text-white font-bold shrink-0">ME</div>
                    <span className="text-[11px] font-semibold text-violet-600 shrink-0">ME</span>
                    <span className="text-[11px] text-violet-500 italic truncate">"Reacted ✨"</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DiaryDetail({ entry, onBack, onSelectRelated }: {
  entry: DiaryEntry;
  onBack: () => void;
  onSelectRelated: (e: DiaryEntry) => void;
}) {
  // Feature D: 피드 연결
  const navigate = useNavigate();
  const [drawingLoaded, setDrawingLoaded] = useState(false);

  const imgSrc = entry.authorId === 'jbk'
    ? '/jungbyeongki.jpg'
    : `/idols/${entry.authorId}/profile.jpg`;

  const dateObj = new Date(entry.date);
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dateStr = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 ${weekdays[dateObj.getDay()]}`;

  const paragraphs = entry.content.split('\n\n').filter(Boolean);

  return (
    <div>
      {/* 브레드크럼 */}
      <div
        className="flex items-center gap-3 px-0 py-3 border-b border-violet-200 rounded-xl mb-1"
        style={{ background: '#F5F3FF', padding: '10px 14px' }}
      >
        <button
          onClick={onBack}
          className="text-violet-600 font-medium text-sm flex items-center gap-1"
        >
          ‹ 목록
        </button>
        <span className="text-gray-400 text-xs">|</span>
        <span className="text-xs text-gray-500 font-medium">{entry.authorName}'s diary</span>
      </div>

      {/* 일기 본문 — 스크롤 없이 전체 flow */}
      <div
        className="px-4 py-6 rounded-xl"
        style={{
          background: '#FAFAFA',
        }}
      >
        {/* 작성자 */}
        <div className="flex items-center gap-3 mb-5">
          <img
            src={imgSrc}
            alt={entry.authorName}
            className="w-14 h-14 rounded-full object-cover shadow"
            style={{ border: '3px solid #8B5CF6' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-profile.jpg'; }}
          />
          <div>
            <div className="font-bold text-gray-800 text-base">{entry.authorName}</div>
            <div className="text-xs text-violet-600">{dateStr}</div>
          </div>
          <span className="ml-auto text-3xl">{entry.mood}</span>
        </div>

        {/* Feature D: 피드 연결 버튼 */}
        <button
          onClick={() => navigate('/feed')}
          className="text-xs text-violet-500 underline mb-4 inline-block"
        >
          📸 이 날의 피드 보기 →
        </button>

        {/* 제목 */}
        <h2
          className="font-bold text-gray-800 mb-4 pb-2 border-b-2 border-violet-200"
          style={{ fontFamily: "'Gowun Dodum', cursive", fontSize: '30px', lineHeight: '1.3' }}
        >
          {entry.title}
        </h2>

        {/* 크레파스 그림 — aspect-ratio로 로드 전부터 공간 확보 (CLS 방지) */}
        <div className="diary-image-container mb-5 rounded-xl overflow-hidden w-full relative">
          {entry.imagePath ? (
            <img
              src={entry.imagePath}
              alt="diary"
              className="w-full h-auto rounded-xl block"
              style={{ aspectRatio: '16/9', opacity: drawingLoaded ? 1 : 0, transition: 'opacity 0.5s ease' }}
              onLoad={() => setDrawingLoaded(true)}
              onError={() => setDrawingLoaded(true)}
            />
          ) : (
            <>
              <img
                src={`/diary/${entry.authorId}.png`}
                alt={`${entry.authorName}의 그림`}
                className="w-full h-auto rounded-xl block"
                style={{ aspectRatio: '16/9', opacity: drawingLoaded ? 1 : 0, transition: 'opacity 0.5s ease' }}
                onLoad={() => setDrawingLoaded(true)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const svgStr = entry.svgDrawing ?? '';
                  const hasRealSvg = svgStr.trim().length > 60 && svgStr.includes('<path');
                  if (hasRealSvg) {
                    const next = target.nextElementSibling as HTMLElement | null;
                    if (next) next.style.display = 'block';
                  } else {
                    const container = target.closest('.diary-image-container') as HTMLElement | null;
                    if (container) container.style.display = 'none';
                  }
                  setDrawingLoaded(true);
                }}
              />
              <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: entry.svgDrawing ?? '' }} />
            </>
          )}
          {/* skeleton — 이미지 위에 absolute overlay, 로드 완료 시 fade-out */}
          {!drawingLoaded && (
            <div
              className="absolute inset-0 rounded-xl"
              style={{
                background: 'linear-gradient(90deg, #F5F3FF 25%, #EDE9FE 50%, #F5F3FF 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite',
              }}
            />
          )}
        </div>

        {/* 본문 — 줄 배경을 텍스트 영역에만 적용 (이미지 로드 타이밍 영향 차단) */}
        <div
          style={{
            backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${entry.themeLineColor ?? 'rgba(100,149,237,0.2)'} 31px, ${entry.themeLineColor ?? 'rgba(100,149,237,0.2)'} 32px)`,
            backgroundSize: '100% 32px',
            backgroundPosition: '0 0',
            paddingTop: 0,
          }}
        >
          {paragraphs.map((para, i) => (
            <p
              key={i}
              className="text-gray-700"
              style={{
                fontFamily: "'Gowun Dodum', cursive",
                wordBreak: 'keep-all',
                lineHeight: '32px',
                paddingBottom: '32px',
                marginBottom: 0,
                fontSize: '17px',
              }}
            >
              {para}
            </p>
          ))}
        </div>

        {/* Feature C: 공감 리액션 (서명 전) */}
        <DiaryReactions entryId={entry.id} entry={entry} />

        {/* 서명 */}
        <div className="mt-4 pt-4 border-t border-violet-200 text-right">
          <span className="text-sm text-violet-500 italic">— {entry.authorName}</span>
        </div>

        {/* Feature B: 비밀 반전 공개 */}
        {entry.secretNote && <SecretNote text={entry.secretNote} />}

        {/* 목록으로 돌아가기 */}
        <div className="mt-8 text-center">
          <button
            onClick={onBack}
            className="px-6 py-2.5 rounded-full text-sm font-medium text-violet-700 border border-violet-300 bg-violet-50 hover:bg-violet-100 active:bg-violet-200 transition-colors"
          >
            ‹ 일기 목록으로 돌아가기
          </button>
        </div>

        {/* Feature F: 시리즈 연결 */}
        {entry.relatedEntries && entry.relatedEntries.length > 0 && (
          <div className="mt-6 pt-4 border-t border-violet-100">
            <p className="text-xs font-bold text-violet-600 mb-3">📖 Related diaries</p>
            <div className="space-y-2">
              {entry.relatedEntries.map(id => {
                const related = DIARY_ENTRIES.find(e => e.id === id);
                if (!related) return null;
                const relatedImg = related.authorId === 'jbk' ? '/jungbyeongki.jpg' : `/idols/${related.authorId}/profile.jpg`;
                return (
                  <button
                    key={id}
                    onClick={() => onSelectRelated(related)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-violet-50 hover:bg-violet-100 transition-colors text-left border border-violet-100"
                  >
                    <img
                      src={relatedImg}
                      alt={related.authorName}
                      className="w-9 h-9 rounded-full object-cover border border-violet-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-700">{related.authorName} {related.mood}</p>
                      <p className="text-xs text-gray-500 truncate">{related.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>

      {/* 푸터 */}
      <div className="pb-6 pt-2 text-center text-xs text-gray-400 flex flex-col gap-0.5">
        <span className="bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent font-semibold text-sm">
          TWIN PLANET chat
        </span>
        <span>
          Made with 💜 by{' '}
          <a href="mailto:simon@hashed.com" className="underline hover:text-gray-600">
            Simon Kim
          </a>
        </span>
      </div>
    </div>
  );
}

export default function DiaryPage() {
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const [filterMember, setFilterMember] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [generatedEntries, setGeneratedEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    fetch('/diary-generated.json')
      .then(r => r.json())
      .then((data: DiaryEntry[]) => setGeneratedEntries(data))
      .catch(() => {});
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

  const todayKST = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const allEntries = [...DIARY_ENTRIES, ...generatedEntries]
    .filter(e => e.date <= todayKST)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = filterMember
    ? allEntries.filter(e => e.authorId === filterMember)
    : allEntries;

  // 드롭다운용 멤버 목록 (S번호 순)
  const memberOptions = [
    ...Object.values(ALL_MEMBERS).sort((a, b) => (a.sNumber ?? 99) - (b.sNumber ?? 99)),
    { id: 'jbk', name: '정병기', sNumber: 25 },
  ];

  // URL에 날짜 파라미터가 있으면 상세 보기
  const selected = date
    ? (allEntries.find(e => e.date === date) ?? null)
    : null;

  const scrollTop = () => {
    setTimeout(() => {
      const scrollEl = (document.querySelector('.premium-bg') || document.querySelector('[class*="overflow-y-auto"]')) as HTMLElement | null;
      if (scrollEl) scrollEl.scrollTop = 0;
      window.scrollTo(0, 0);
    }, 0);
  };

  const goToEntry = (entry: DiaryEntry) => {
    scrollTop();
    navigate(`/diary/${entry.date}`);
  };

  const goToList = () => {
    scrollTop();
    navigate('/diary');
  };

  if (selected) {
    return (
      <DiaryDetail
        key={selected.id}
        entry={selected}
        onBack={goToList}
        onSelectRelated={goToEntry}
      />
    );
  }

  return (
    <div>
      {/* 헤더: 오늘의 일기 + 멤버 필터 + 랜덤 읽기 */}
      <div
        className="px-4 pt-4 pb-3 border-b border-violet-200 mb-4 flex items-center justify-between gap-2 rounded-xl"
        style={{ background: '#F5F3FF' }}
      >
        {/* 왼쪽: 제목 */}
        <h1 className="text-sm font-normal text-gray-900 shrink-0">SECRET DIARY 📖</h1>

        {/* 오른쪽: 멤버 필터 드롭다운 */}
        <div ref={dropdownRef} className="relative shrink-0">
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className="flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-1 hover:bg-violet-100 transition-colors whitespace-nowrap"
          >
            {filterMember ? (ALL_MEMBERS[filterMember]?.name ?? 'ALL') : 'ALL'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {dropdownOpen && (
            <div
              className="absolute top-full right-0 mt-1.5 bg-white rounded-2xl z-50 p-3"
              style={{ boxShadow: '0 8px 32px -4px rgba(0,0,0,0.14)', width: '252px' }}
            >
              {/* 모두 보기 */}
              <button
                onClick={() => { setFilterMember(''); setDropdownOpen(false); }}
                className={`w-full text-left text-sm font-semibold px-3 py-1.5 rounded-lg mb-2 transition-colors ${!filterMember ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                ✓ ALL
              </button>
              {/* 멤버 3열 그리드 */}
              <div className="grid grid-cols-3 gap-1">
                {memberOptions.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setFilterMember(m.id); setDropdownOpen(false); }}
                    className={`flex flex-col items-center py-1.5 px-1 rounded-lg transition-colors ${filterMember === m.id ? 'bg-violet-100 text-violet-700' : 'text-gray-600 hover:bg-gray-50'}`}
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

      {/* 일기 목록 */}
      <div className="px-0 space-y-3">
        {filtered.map((entry) => (
          <DiaryCard key={entry.id} entry={entry} onClick={() => goToEntry(entry)} />
        ))}
        <div className="py-4 text-center text-xs text-violet-500">
        25명이 돌아가며 매일 씁니다 ✏️
      </div>
      </div>

      <SiteFooter />
    </div>
  );
}
