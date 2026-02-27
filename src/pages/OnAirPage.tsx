import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

interface OnairSession {
  id: number;
  member_id: string;
  member_name: string;
  started_at: string;
  ends_at: string;
  is_active: boolean;
  last_chat_at: string | null;
}

interface OnairMessage {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
}

interface SystemMessage {
  type: 'system';
  id: string;
  content: string;
  created_at: string;
}

type DisplayItem = (OnairMessage & { type?: never }) | SystemMessage;

function getHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

function parseMember(authorName: string): { memberId: string | null; displayName: string } {
  const match = authorName.match(/^\[MEMBER:(\w+)\](.+)/);
  if (match && match[1] && match[1] !== 'undefined' && match[2] && match[2] !== 'undefined') return { memberId: match[1], displayName: match[2] };
  return { memberId: null, displayName: authorName };
}

function getMemberAvatar(memberId: string): string {
  return `/idols/${memberId}/profile.jpg`;
}

// タレント別吹き出し色
const MEMBER_COLORS: Record<string, { bg: string; name: string }> = {
  mizyu:    { bg: '#FFE4EE', name: '#FF6B9D' },
  rin:      { bg: '#F3E8FF', name: '#9B59B6' },
  suzuka:   { bg: '#FFF3E0', name: '#E67E22' },
  kanon:    { bg: '#E3F2FD', name: '#3498DB' },
  nako:     { bg: '#FCE4EC', name: '#E91E63' },
  nana:     { bg: '#FFFDE7', name: '#F9A825' },
  taiyo:    { bg: '#E1F5FE', name: '#0288D1' },
  yoshiaki: { bg: '#EDE7F6', name: '#673AB7' },
  michi:    { bg: '#FCE4EC', name: '#C2185B' },
};
function getMemberColor(memberId: string) {
  return MEMBER_COLORS[memberId] ?? { bg: '#EDE9FE', name: '#7C3AED' };
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatCountdown(isoStr: string, now: Date): string {
  const diff = new Date(isoStr).getTime() - now.getTime();
  if (diff <= 0) return '곧';
  const totalMins = Math.floor(diff / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs > 0) return mins > 0 ? `${hrs}시간 ${mins}분` : `${hrs}시간`;
  return `${mins}분`;
}

function toDisplayItems(messages: OnairMessage[]): DisplayItem[] {
  return messages.map((msg) =>
    msg.author_name === '[SYSTEM]' || msg.author_name === '[EMOJI_REACTION]' || msg.author_name === '[TOPIC]'
      ? { type: 'system' as const, id: msg.id, content: msg.content, created_at: msg.created_at }
      : (msg as (OnairMessage & { type?: never }))
  );
}

export default function OnAirPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<DisplayItem[]>([]);
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [now, setNow] = useState(() => Date.now());
  const [onlineMembers, setOnlineMembers] = useState<{ id: string; name: string }[]>([]);
  const [activeSessions, setActiveSessions] = useState<OnairSession[]>([]);
  const [nextSession, setNextSession] = useState<OnairSession | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCreatedAtRef = useRef<string | null>(null);
  const memberNameMap = useRef<Record<string, string>>({});
  const isFirstLoad = useRef<boolean>(true);
  const pendingQueueRef = useRef<DisplayItem[]>([]);
  const isTypingRef = useRef<boolean>(false);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [typingMsg, setTypingMsg] = useState<{ item: OnairMessage; displayed: string } | null>(null);

  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const visibleMessages = messages.filter((m) => {
    // 2시간 이전 메시지 숨김 (DB는 유지, 표시만 제외)
    const createdAt = (m as { created_at?: string }).created_at
      ? new Date((m as { created_at: string }).created_at).getTime()
      : 0;
    if (createdAt > 0 && now - createdAt > TWO_HOURS_MS) return false;

    if ('type' in m && m.type === 'system') {
      // [EMOJI_REACTION] 쿨다운 마커 숨김
      return !m.content.startsWith('[emoji:');
    }
    const msg = m as OnairMessage;
    return msg.author_name !== '[EMOJI_REACTION]' && msg.author_name !== '[TOPIC]';
  });

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  // 글자별 타이핑 효과 — 새 메시지를 큐에서 하나씩 꺼내 25ms/글자로 reveal
  const startTypingQueue = useCallback(() => {
    if (isTypingRef.current || pendingQueueRef.current.length === 0) return;
    const next = pendingQueueRef.current.shift()!;

    // 시스템 메시지 → 즉시 추가
    if ('type' in next && next.type === 'system') {
      setMessages(prev => [...prev, next]);
      setTimeout(() => startTypingQueue(), 600);
      return;
    }

    const msg = next as OnairMessage;
    const fullContent = msg.content;
    let i = 0;
    isTypingRef.current = true;
    setTypingMsg({ item: msg, displayed: '' });

    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    typingIntervalRef.current = setInterval(() => {
      i++;
      setTypingMsg({ item: msg, displayed: fullContent.slice(0, i) });
      // 6글자마다 하단 스크롤 (타이핑 중 말풍선 짤림 방지)
      if (i % 6 === 0) {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }
      if (i >= fullContent.length) {
        clearInterval(typingIntervalRef.current!);
        typingIntervalRef.current = null;
        // 깜빡임 방지: messages 추가 + typingMsg 제거를 동시에 (단일 렌더링 사이클)
        setMessages(prev => [...prev, next]);
        setTypingMsg(null);
        isTypingRef.current = false;
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
        setTimeout(() => startTypingQueue(), 500);
      }
    }, 78); // 78ms/글자 (65ms → 20% 더 느리게)
  }, []);

  // onair_sessions에서 실제 활성 멤버 업데이트
  const fetchActiveSessions = useCallback(async () => {
    try {
      const nowIso = new Date().toISOString();
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/onair_sessions?is_active=eq.true&ends_at=gt.${encodeURIComponent(nowIso)}&select=*`,
        { headers: getHeaders() }
      );
      if (!res.ok) return;
      const data: OnairSession[] = await res.json();
      data.forEach((s) => {
        memberNameMap.current[s.member_id] = s.member_name;
      });
      setActiveSessions(data);
      setOnlineMembers(data.map(s => ({ id: s.member_id, name: s.member_name })));
      // 다음 예정 세션 조회
      const nextRes = await fetch(
        `${SUPABASE_URL}/rest/v1/onair_sessions?is_active=eq.false&started_at=gte.${encodeURIComponent(new Date().toISOString())}&order=started_at.asc&limit=1`,
        { headers: getHeaders() }
      );
      const nextData = await nextRes.json();
      setNextSession(Array.isArray(nextData) && nextData.length > 0 ? nextData[0] : null);
    } catch (e) {
      console.error('OnAirPage fetchActiveSessions error', e);
    }
  }, []);

  const fetchTopic = useCallback(async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/onair_messages?author_name=eq.[TOPIC]&order=created_at.desc&limit=1&select=content`,
        { headers: getHeaders() }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].content) {
        setCurrentTopic(data[0].content);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchTopic();
    const interval = setInterval(fetchTopic, 30000);
    return () => clearInterval(interval);
  }, [fetchTopic]);

  // 초기 메시지 로드 + 활성 세션 로드
  useEffect(() => {
    const load = async () => {
      try {
        // 최신순으로 최근 2시간 이내 메시지만 가져옴 (오래된 100개 → 빈 화면 버그 방지)
        const twoHoursAgo = encodeURIComponent(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
        const nowIso = encodeURIComponent(new Date().toISOString());
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/onair_messages?order=created_at.desc&limit=100&and=(created_at.gte.${twoHoursAgo},created_at.lte.${nowIso})`,
          { headers: getHeaders() }
        );
        if (!res.ok) return;
        const data: OnairMessage[] = await res.json();
        const sorted = [...data].reverse(); // desc → asc 정렬로 복원
        const displayItems = toDisplayItems(sorted);
        setMessages(displayItems);
        if (isFirstLoad.current) {
          setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'auto' });
          }, 50);
          setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'auto' });
          }, 300);
          isFirstLoad.current = false;
        }
        const lastMsg = sorted[sorted.length - 1];
        if (sorted.length > 0 && lastMsg) {
          lastCreatedAtRef.current = lastMsg.created_at;
        }
      } catch (e) {
        console.error('OnAirPage load error', e);
      }
    };
    load();
    fetchActiveSessions();
  }, [fetchActiveSessions]);

  // onair_sessions 30초마다 폴링
  useEffect(() => {
    const interval = setInterval(fetchActiveSessions, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveSessions]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // 새 메시지 도착 시 자동 스크롤
  useEffect(() => {
    if (isFirstLoad.current) return;
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 타이핑 말풍선 시작 시 스크롤
  const prevTypingRef = useRef<boolean>(false);
  useEffect(() => {
    const nowTyping = typingMsg !== null;
    if (nowTyping && !prevTypingRef.current) scrollToBottom();
    prevTypingRef.current = nowTyping;
  }, [typingMsg, scrollToBottom]);

  // 폴링 (5초마다 새 메시지)
  useEffect(() => {
    const poll = async () => {
      const lastTs = lastCreatedAtRef.current;
      if (!lastTs) return;
      try {
        const encoded = encodeURIComponent(lastTs);
        const nowIso = encodeURIComponent(new Date().toISOString());
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/onair_messages?order=created_at.asc&and=(created_at.gt.${encoded},created_at.lte.${nowIso})`,
          { headers: getHeaders() }
        );
        if (!res.ok) return;
        const data: OnairMessage[] = await res.json();
        const displayItems = toDisplayItems(data);
        const lastPoll = data[data.length - 1];
        if (data.length > 0 && lastPoll) {
          pendingQueueRef.current.push(...displayItems);
          lastCreatedAtRef.current = lastPoll.created_at;
          if (!isTypingRef.current) startTypingQueue();
        }
      } catch (e) {
        console.error('OnAirPage poll error', e);
      }
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  // 리액션바 제거됨

  type Tab = 'group' | 'solo' | 'feed' | 'diary' | 'community' | 'pulse' | 'onair';
  const activeTab: Tab =
    location.pathname === '/' || location.pathname.startsWith('/onair') ? 'onair'
    : location.pathname.startsWith('/feed') ? 'feed'
    : location.pathname.startsWith('/rooms') ? 'group'
    : location.pathname.startsWith('/chat') ? 'solo'
    : location.pathname.startsWith('/community') ? 'community'
    : location.pathname.startsWith('/pulse') ? 'pulse'
    : location.pathname.startsWith('/diary') ? 'diary'
    : 'onair';

  return (
    <>
      <style>{'@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.2} } @keyframes onair-blink { 0%,100%{opacity:1} 50%{opacity:0.4} } @keyframes typing-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-8px)} }'}</style>
      <div className="flex justify-center overflow-hidden" style={{ height: '100dvh' }}>
      <div className="w-full bg-white flex flex-col" style={{ maxWidth: '750px', height: '100%' }}>

        {/* === App Header === */}
        <div className="premium-bg relative">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="mx-auto px-4 pt-6 pb-0 relative z-10" style={{ maxWidth: '750px' }}>
            <div className="text-left mb-5">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex items-center justify-start gap-2 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <img src="/tp-logo.svg" alt="tp" style={{ width: '36px', height: '38px' }} />
                <h1 className="text-[27px] font-black tracking-tight shimmer-text" style={{ color: '#1a1a1a' }}>twinplanet.chat</h1>
                <span className="ml-1.5 px-2.5 py-0.5 text-[10px] beta-badge rounded-full" style={{ background: '#dcff00', color: '#1a1a1a' }}>Beta</span>
              </button>
              <p className="text-sm font-normal tracking-tight bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">
                TWIN PLANET タレントと AI チャット ✨
              </p>
            </div>
            {/* Tab Bar */}
            <div className="flex mb-0 border-b border-gray-200">
              {([
                { tab: 'onair',     path: '/',          label: 'ON AIR' },
                { tab: 'feed',      path: '/feed',      label: 'FEED' },
                { tab: 'group',     path: '/rooms',     label: 'CHAT' },
                { tab: 'solo',      path: '/chat',      label: '1:1' },
                { tab: 'diary',     path: '/diary',     label: 'DIARY' },
                { tab: 'community', path: '/community', label: 'RADAR' },
                { tab: 'pulse',     path: '/pulse',     label: 'PULSE' },
              ] as { tab: Tab; path: string; label: string }[]).map(({ tab, path, label }) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => navigate(path)}
                    className="py-2.5 pr-5 pl-0 text-[14px] transition-all duration-200 flex items-center justify-start"
                    style={{
                      fontWeight: active ? 700 : 400,
                      color: active ? '#7C3AED' : '#6B7280',
                      borderBottom: '2px solid transparent',
                      marginBottom: '-1px',
                      background: 'transparent',
                    }}
                  >
                    <span style={{
                      borderBottom: active ? '2px solid #7C3AED' : '2px solid transparent',
                      paddingBottom: '10px',
                    }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 헤더 — 멤버 표시 */}
      <div
        className="shrink-0"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #FF6B9D)' }}
      >
        <div className="w-full px-4 pt-3 pb-2 flex items-start gap-3">
          {/* TOPIC — 헤더 가장 왼쪽, 2줄 */}
          {currentTopic && (
            <div className="flex flex-col justify-center shrink-0 self-center" style={{ minWidth: '64px', maxWidth: '80px' }}>
              <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest leading-none">TOPIC</span>
              <span className="text-[11px] font-semibold text-white mt-0.5 leading-snug break-keep">{currentTopic}</span>
            </div>
          )}
          {currentTopic && <div className="w-px bg-white/25 self-stretch shrink-0" />}

          <div className="flex items-start gap-3 flex-wrap flex-1">
            {onlineMembers.length > 0 && (
              <div className="flex gap-3">
                {onlineMembers.map((m) => {
                  const session = activeSessions.find((s) => s.member_id === m.id);
                  if (!session) return null;
                  return (
                    <div key={m.id} className="flex-col items-center flex">
                      <div className="relative">
                        <img
                          src={getMemberAvatar(m.id)}
                          alt={m.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white/60"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/favicon.ico';
                          }}
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border border-white" style={{ animation: 'onair-blink 1.5s ease-in-out infinite' }} />
                      </div>
                      <div className="text-[10px] text-white/90 mt-1">{m.name}</div>
                      <div className="text-[9px] text-white/60">{formatCountdown(session.ends_at, new Date(now))} left</div>
                    </div>
                  );
                })}
              </div>
            )}
            {nextSession && (
              <>
                <div className="w-px h-10 bg-white/25 mx-2 self-center" />
                <div className="flex-col items-center flex">
                  <div className="relative">
                    <img
                      src={`/idols/${nextSession.member_id}/profile.jpg`}
                      alt={nextSession.member_name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-dashed border-white/40 grayscale opacity-60"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="absolute -bottom-1 -right-1 bg-amber-400 rounded-full flex items-center justify-center px-1" style={{ height: '14px', minWidth: '22px' }}>
                      <span className="text-[7px] font-black text-amber-900 leading-none">NEXT</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-white/70 mt-1">{nextSession.member_name}</div>
                  <div className="text-[9px] text-white/50">in {formatCountdown(nextSession.started_at, new Date(now))}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* TOPIC 배너 제거 — 헤더 내 왼쪽으로 이동 */}

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto w-full pl-3 pr-5 pb-6 pt-4 space-y-0.5 custom-scrollbar">
        {visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            まもなく放送が始まります 🎙️
          </div>
        ) : (
          visibleMessages.map((item, i) => {
            if (item.type === 'system' || ('author_name' in item && (item as OnairMessage).author_name === '[SYSTEM]')) {
              const isTopicDivider = !item.content.includes('입장했습니다') && !item.content.includes('퇴장했습니다') && !item.content.startsWith('[emoji:');
              if (isTopicDivider) {
                return (
                  <div key={item.id} className="py-3 px-1 my-1" style={{ userSelect: 'none' }}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #A855F7, #EC4899)' }} />
                      <div
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold text-white shrink-0 shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 60%, #F97316 100%)' }}
                      >
                        <span>✨</span>
                        <span>{item.content}</span>
                      </div>
                      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #EC4899, #F97316, transparent)' }} />
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={item.id}
                  style={{
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '12px',
                    padding: '6px 0',
                    userSelect: 'none',
                  }}
                >
                  {item.content}
                </div>
              );
            }

            const msg = item as OnairMessage;
            const { memberId, displayName } = parseMember(msg.author_name);
            const isMember = memberId !== null;

            if (isMember && memberId) {
              const prevMsg = i > 0 ? visibleMessages[i - 1] : null;
              const prevParsed = prevMsg && prevMsg.type !== 'system' ? parseMember((prevMsg as OnairMessage).author_name) : null;
              const showName = !prevParsed || prevParsed.memberId !== memberId;
              const nextMsg = i < visibleMessages.length - 1 ? visibleMessages[i + 1] : null;
              const nextParsed = nextMsg && nextMsg.type !== 'system' ? parseMember((nextMsg as OnairMessage).author_name) : null;
              const showAvatar = !nextParsed || nextParsed.memberId !== memberId;

              return (() => { const mc = getMemberColor(memberId); return (
                <div key={msg.id} className={showName ? 'mt-3' : 'mt-2'}>
                  <div className="flex items-end gap-2">
                    <div className="w-10 shrink-0 self-end">
                      {showAvatar ? (
                        <img
                          src={getMemberAvatar(memberId)}
                          alt={displayName}
                          className="w-10 h-10 rounded-full object-cover shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/favicon.ico';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {showName && (
                        <span className="text-[12px] font-bold ml-1 mb-1 block" style={{ color: mc.name }}>
                          {displayName}
                        </span>
                      )}
                      <div className="flex items-end gap-1.5">
                        <div
                          className="px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-800 leading-relaxed shadow-sm max-w-[80%]"
                          style={{ backgroundColor: mc.bg }}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0 pb-0.5">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ); })();
            }

            // 기타 메시지 (시스템 아닌 것) — 표시 안 함
            return null;
          })
        )}

        {/* 타이핑 중인 말풍선 */}
        {typingMsg && (() => {
          const { item: msg, displayed } = typingMsg;
          const { memberId, displayName } = parseMember(msg.author_name);
          if (!memberId) return null;
          // 이전 메시지와 같은 멤버면 이름 숨기기 → 완료 후 레이아웃 변화(깜빡임) 방지
          const lastVisible = visibleMessages.length > 0 ? visibleMessages[visibleMessages.length - 1] : null;
          const lastParsed = lastVisible && !('type' in lastVisible) ? parseMember((lastVisible as OnairMessage).author_name) : null;
          const showTypingName = !lastParsed || lastParsed.memberId !== memberId;
          return (
            <div className={showTypingName ? 'mt-3' : 'mt-2'}>
              <div className="flex items-end gap-2">
                <div className="w-10 shrink-0 self-end">
                  <img
                    src={getMemberAvatar(memberId)}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover shadow-sm"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/favicon.ico'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  {showTypingName && <span className="text-[12px] font-bold ml-1 mb-1 block" style={{ color: getMemberColor(memberId).name }}>{displayName}</span>}
                  <div className="flex items-end gap-1.5">
                    <div
                      className="px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-800 leading-relaxed shadow-sm max-w-[80%]"
                      style={{ backgroundColor: getMemberColor(memberId).bg }}
                    >
                      {displayed}<span className="animate-pulse text-violet-400">▌</span>
                    </div>
                    {/* 시간 자리 예약 — 타이핑 완료 후 bubble 크기 변화(깜빡임) 방지 */}
                    <span className="text-[10px] shrink-0 pb-0.5 invisible">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <div ref={bottomRef} />
      </div>

      {/* 리액션바 제거 */}

      </div>
    </div>

    {/* 리액션 오버레이 제거됨 */}
    </>
  );
}
