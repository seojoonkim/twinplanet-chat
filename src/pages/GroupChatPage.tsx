import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { findMatchingMeme, MEMES } from '@/constants/memes';
import MemeCard from '@/components/chat/MemeCard';
import {
  type RoomMember,
  type GroupTopic,
  getRoomById,
  getRoomMembers,
  getRoomMemberOrder,
  DEFAULT_ROOM_ID,
} from '@/constants/group-rooms';

type SpeakerId = string; // memberId or 'jungbyeongki'

// ─── 타입 ─────────────────────────────────────────────────────

interface ChatMessage {
  speaker: SpeakerId | 'fan';
  text: string;
  timestamp: number;
  memeId?: string; // 짤방 메시지
}

// ─── 밈 트리거 버튼 정의 ──────────────────────────────────────

// ─── 프로필 아바타 (얼굴 이미지 + fallback) ──────────────────

function ColorAvatar({ member, size = 'md' }: { member: RoomMember; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const px = size === 'sm' ? 'w-10 h-10 text-xs' : size === 'xl' ? 'w-14 h-14 text-lg' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';
  return (
    <div
      className={`${px} rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}
      style={{ background: member.color }}
    >
      {member.initials}
    </div>
  );
}

const MemberAvatar = memo(function MemberAvatar({ member, size = 'md', priority = false }: { member: RoomMember; size?: 'sm' | 'md' | 'lg' | 'xl'; priority?: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = `/idols/${member.id}/profile.jpg`;
  const px = size === 'sm' ? 'w-10 h-10' : size === 'xl' ? 'w-14 h-14' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';

  if (!imgFailed) {
    return (
      <img
        src={src}
        alt={member.name}
        className={`${px} rounded-full object-cover shrink-0 shadow-sm`}
        loading={priority ? 'eager' : 'lazy'}
        {...(priority ? { fetchPriority: 'high' as const } : {})}
        decoding="async"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return <ColorAvatar member={member} size={size} />;
});

// ─── 시간 포맷 ────────────────────────────────────────────────

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const period = h < 12 ? '오전' : '오후';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${hour12}:${m}`;
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────

export default function GroupChatPage() {
  const navigate = useNavigate();
  const { roomId: rawRoomId } = useParams<{ roomId: string }>();
  const roomId = rawRoomId || DEFAULT_ROOM_ID;
  const room = useMemo(() => getRoomById(roomId), [roomId]);
  const MEMBERS = useMemo(() => (room ? getRoomMembers(room) : {}), [room]);
  const MEMBER_ORDER = useMemo(() => (room ? getRoomMemberOrder(room) : []), [room]);
  const TOPICS = useMemo(() => (room ? room.topics : []), [room]);
  const [topic, setTopic] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<SpeakerId | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  // Group memory: past topics discussed
  const [pastTopics, setPastTopics] = useState<string[]>([]);
  const pastTopicsRef = useRef<string[]>([]);
  // 팬 끼어들기 입력 상태
  const [fanInput, setFanInput] = useState('');
  const fanInputRef = useRef<HTMLInputElement>(null);
  // 팬 pending 메시지 큐 (runConversation loop에서 소비)
  const fanPendingRef = useRef<ChatMessage[]>([]);
  // 밈 트리거
  const triggerTopicRef = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const turnRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recentActionsRef = useRef<Record<string, number[]>>({});
  const recentMemeIdsRef = useRef<string[]>([]);
  const jbkCountRef = useRef(0);
  const nextJbkTurnRef = useRef(0);
  const roundRobinRef = useRef(0); // Bug 2: round-robin 위치 별도 관리
  const speakerCountRef = useRef<Record<string, number>>({}); // 멤버별 발화 횟수 추적
  const runGenRef = useRef(0); // 실행 세대 카운터 — 이전 runConversation이 끝나도 setIsDone(true) 막기 위함

  // Typewriter queue system
  const charQueueRef = useRef<string[]>([]);
  const drainTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const displayedRef = useRef('');

  const MAX_TURNS = 16;

  // ─── Group memory: sync ref when state changes ────────────
  useEffect(() => {
    pastTopicsRef.current = pastTopics;
  }, [pastTopics]);

  // ─── Group memory: load from localStorage on room enter ───
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`tsc_grp_mem_${roomId}`);
      if (raw) {
        const mem = JSON.parse(raw) as { topics?: string[]; lastVisit?: string };
        if (mem.topics && mem.topics.length > 0) {
          setPastTopics(mem.topics.slice(-5));
        }
      }
    } catch {
      // ignore
    }
  }, [roomId]);

  // ─── Group memory: save topic when conversation finishes ──
  useEffect(() => {
    if (!isDone || !topic) return;
    const topicData = TOPICS.find((t) => t.id === topic);
    if (!topicData) return;
    const topicLabel = `${topicData.emoji} ${topicData.label}`;
    setPastTopics((prev) => {
      const updated = [...prev.filter((t) => t !== topicLabel), topicLabel].slice(-5);
      try {
        localStorage.setItem(
          `tsc_grp_mem_${roomId}`,
          JSON.stringify({ topics: updated, lastVisit: new Date().toISOString() }),
        );
      } catch {
        // ignore
      }
      return updated;
    });
  }, [isDone, topic, roomId, TOPICS]);

  // ─── Timer functions ──────────────────────────────────────
  function formatTimer(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function startTimer() {
    clearTimer();
    setTimeLeft(300);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          abortRef.current?.abort();
          setIsDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // ─── Action system ────────────────────────────────────────
  function getRandomAction(speaker: string): string {
    const actions = MEMBERS[speaker]?.actions;
    if (!actions) return '';
    const recent = recentActionsRef.current[speaker] || [];
    const available = actions.map((_: string, i: number) => i).filter((i: number) => !recent.includes(i));
    const pool = available.length > 0 ? available : actions.map((_: string, i: number) => i);
    const idx = pool[Math.floor(Math.random() * pool.length)] ?? 0;
    recentActionsRef.current[speaker] = [...recent.slice(-7), idx];
    return actions[idx] ?? '';
  }

  // ─── Render message text with action styling ──────────────
  function renderMessageText(text: string) {
    const parts = text.split(/(\([^)]+\))/g);
    return parts.map((part, i) => {
      // 완성된 동작 (스트리밍 완료 후)
      if (part.startsWith('(') && part.endsWith(')')) {
        return <em key={i} className="text-gray-400 text-xs not-italic font-medium">{part} </em>;
      }
      // 미완성 동작 (스트리밍 중 — 닫는 ) 아직 없음)
      if (part.startsWith('(')) {
        return <em key={i} className="text-gray-400 text-xs not-italic font-medium">{part}</em>;
      }
      return <span key={i}>{part}</span>;
    });
  }

  // Start draining the character queue
  const startDrain = useCallback(() => {
    if (drainTimerRef.current) return;
    drainTimerRef.current = setInterval(() => {
      if (charQueueRef.current.length > 0) {
        const ch = charQueueRef.current.shift()!;
        displayedRef.current += ch;
        setDisplayedText(displayedRef.current);
      }
    }, 46); // 기존 40ms → 46ms (15% 느리게)
  }, []);

  const stopDrain = useCallback(() => {
    if (drainTimerRef.current) {
      clearInterval(drainTimerRef.current);
      drainTimerRef.current = null;
    }
  }, []);

  const resetTypewriter = useCallback(() => {
    stopDrain();
    charQueueRef.current = [];
    displayedRef.current = '';
    setDisplayedText('');
  }, [stopDrain]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopDrain(); clearTimer(); };
  }, [stopDrain]);

  // auto-scroll — 새 메시지/스트리밍 업데이트마다 레이아웃 페인트 이후에 스크롤
  useEffect(() => {
    const scroll = () => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); };
    const t0 = setTimeout(scroll, 50);
    const t1 = setTimeout(scroll, 200);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [messages, displayedText, currentSpeaker]);

  // 직전 메시지에서 호명된 멤버 추출
  // Bug 1 수정: actionSuffix를 명확한 지목/질문 패턴으로만 제한 (는/이/야/네 등 초빈출 조사 제거)
  function extractAddressedMember(text: string, curSpeaker: string): string | null {
    // 이름 다음에 올 수 있는 조사/접속사 패턴
    const nameParticle = /(?:아|이|부터|한테|도|야|는|은|이야|이가|가)?/;
    const actionSuffix = /\s*(?:부터\s*)?(?:어때[?？]?|어떠[?？]?|어떻게[?？]?|해볼래[?？]?|해봐[?？]?|차례야?|말해[봐줘]?[?？]?|얘기해[봐줘]?[?？]?|물어볼게[?？]?|생각은[?？]?|너는[?？]?|너부터|먼저 말해|한번 말해|알려줘[?！]?|설명해[봐줘]?[?？]?)/;
    // 동적: 현재 방 멤버 이름으로 패턴 생성
    for (const memberId of MEMBER_ORDER) {
      if (memberId === curSpeaker) continue;
      const m = MEMBERS[memberId];
      if (!m) continue;
      const nameBase = m.name;
      // 패턴1: 이름 + 조사 + 액션 동사 ("린부터 얘기해봐", "린이 말해봐")
      const combined = new RegExp(nameBase + nameParticle.source + actionSuffix.source);
      if (combined.test(text)) return memberId;
      // 패턴2: 이름 + 구두점 ("린,", "린!")
      const withPunct = new RegExp(nameBase + nameParticle.source + /\s*[,，?？!]/.source);
      if (withPunct.test(text)) return memberId;
      // 패턴3: "린부터" 단독 (후행 구두점 없어도)
      const withButo = new RegExp(nameBase + /부터/.source);
      if (withButo.test(text)) return memberId;
    }
    return null;
  }

  // pick next speaker: round-robin with 20% random skip
  // Bug 2 수정: roundRobinRef 별도 관리, Bug 4 수정: 직전 화자 제외
  const getNextSpeaker = useCallback((lastSpeaker?: SpeakerId): string => {
    if (Math.random() < 0.2) {
      // 20% 랜덤이지만 직전 화자는 제외
      const pool = MEMBER_ORDER.filter(id => id !== lastSpeaker);
      return pool[Math.floor(Math.random() * pool.length)]!;
    }
    const next = MEMBER_ORDER[roundRobinRef.current % MEMBER_ORDER.length]!;
    roundRobinRef.current++;
    return next;
  }, []);

  // stream one turn from API
  const streamTurn = useCallback(
    async (speaker: SpeakerId, topicStarter: string, history: ChatMessage[], triggerTopic?: string | null) => {
      const controller = new AbortController();
      abortRef.current = controller;

      setCurrentSpeaker(speaker);
      resetTypewriter();

      // ✅ 액션을 스트리밍 시작 전에 미리 큐에 넣어 즉시 표시
      let preAction = '';
      if (speaker !== 'jungbyeongki' && Math.random() < 0.2) {
        preAction = getRandomAction(speaker);
      }
      if (preAction) {
        for (const ch of preAction + ' ') {
          charQueueRef.current.push(ch);
        }
      }

      const res = await fetch('/api/group-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicStarter,
          history: history.map((m) => ({ speaker: m.speaker, text: m.text })),
          currentSpeaker: speaker,
          roomId,
          roomMembers: room?.memberIds,
          ...(triggerTopic ? { triggerTopic } : {}),
          ...(pastTopicsRef.current.length > 0 ? { pastTopics: pastTopicsRef.current } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error('API error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let queuedCharCount = 0; // prefix 제거 후 큐에 넣은 글자 수

      // 드레인 시작 (액션 chars가 이미 큐에 있으므로 즉시 표시됨)
      startDrain();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === 'text' && evt.text) {
              fullText += evt.text;
              // 이름 prefix 제거 후 새 글자만 큐에 추가
              const displayText = fullText.replace(/^[가-힣]{2,4}:\s*/u, '');
              const newChars = displayText.slice(queuedCharCount);
              queuedCharCount = displayText.length;
              for (const ch of newChars) {
                charQueueRef.current.push(ch);
              }
            }
          } catch {
            // skip
          }
        }
      }

      // Wait for queue to drain completely
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (charQueueRef.current.length === 0) {
            clearInterval(check);
            resolve();
          }
        }, 30);
      });

      stopDrain();
      // 이름 prefix 제거 안전망: "채원: " "김채원: " 등 앞에 붙으면 삭제
      const stripped = fullText.trim().replace(/^[가-힣]{2,4}:\s*/u, '').replace(/^정병기 대표:\s*/u, '');
      // 액션은 이미 스트리밍 시작 전에 큐에 넣었으므로 반환값에만 합쳐서 history에 기록
      return preAction ? `${preAction} ${stripped}` : stripped;
    },
    [resetTypewriter, startDrain, stopDrain],
  );

  // run the conversation loop
  const runConversation = useCallback(
    async (topicId: string) => {
      const myGen = ++runGenRef.current; // 이 실행의 세대 번호 확보
      const selectedTopic = TOPICS.find((t) => t.id === topicId);
      if (!selectedTopic) return;

      setIsDone(false);
      setMessages([]);
      turnRef.current = 0;
      jbkCountRef.current = 0;
      nextJbkTurnRef.current = 4 + Math.floor(Math.random() * 3); // first possible at turn 4-6
      recentActionsRef.current = {};
      recentMemeIdsRef.current = [];
      roundRobinRef.current = 0; // Bug 2: round-robin 초기화
      speakerCountRef.current = {}; // 발화 횟수 초기화
      fanPendingRef.current = []; // 팬 큐 초기화

      const history: ChatMessage[] = [];

      for (let turn = 0; turn < MAX_TURNS; turn++) {
        turnRef.current = turn;

        // 팬 메시지 드레인: 대기 중인 팬 메시지를 history + messages에 삽입
        // (handleFanSubmit에서 즉시 추가하지 않고 여기서만 추가 → 현재 멤버 말풍선 아래에 표시)
        while (fanPendingRef.current.length > 0) {
          const fanMsg = fanPendingRef.current.shift()!;
          history.push(fanMsg);
          setMessages((prev) => [...prev, fanMsg]);
        }

        // 정병기 대표 등장 체크
        let speaker: SpeakerId;
        if (
          jbkCountRef.current < 4 &&
          turn >= nextJbkTurnRef.current &&
          Math.random() < 0.3
        ) {
          speaker = 'jungbyeongki';
          jbkCountRef.current++;
          nextJbkTurnRef.current = turn + 4 + Math.floor(Math.random() * 3);
        } else {
          // Bug 3: meme 메시지 제외한 마지막 메시지만 참조하여 지목 추출 (팬 메시지도 제외)
          const lastNonMemeMessage = [...history].reverse().find(m => !m.memeId && m.speaker !== 'fan');
          // 'fan' 필터링됐으므로 SpeakerId로 안전하게 캐스트
          const lastSpeakerId = lastNonMemeMessage?.speaker as SpeakerId | undefined;
          if (lastNonMemeMessage && lastSpeakerId && lastSpeakerId !== 'jungbyeongki') {
            const addressed = extractAddressedMember(lastNonMemeMessage.text, lastSpeakerId);
            if (addressed) {
              speaker = addressed;
              // Bug 2: 지목 후 round-robin 위치를 addressed 다음 멤버로 동기화
              const idx = MEMBER_ORDER.indexOf(addressed);
              if (idx >= 0) roundRobinRef.current = idx + 1;
            } else {
              speaker = getNextSpeaker(lastSpeakerId);
            }
          } else {
            speaker = getNextSpeaker(lastSpeakerId);
          }

          // 발화 횟수 cap: 한 멤버 MAX_TURNS*0.35 초과 시 가장 적게 말한 멤버로 교체
          const MAX_PER_SPEAKER = Math.ceil(MAX_TURNS * 0.35); // 16턴 → 최대 6회
          {
            const cnt = speakerCountRef.current[speaker] ?? 0;
            if (cnt >= MAX_PER_SPEAKER) {
              const alt = MEMBER_ORDER
                .filter(id => id !== speaker)
                .sort((a, b) => (speakerCountRef.current[a] ?? 0) - (speakerCountRef.current[b] ?? 0))[0];
              if (alt) speaker = alt;
            }
          }
        }

        try {
          const text = await streamTurn(speaker, selectedTopic.starter, history, triggerTopicRef.current);
          triggerTopicRef.current = null; // 사용 후 초기화
          if (!text) continue;

          const msg: ChatMessage = { speaker, text, timestamp: Date.now() };
          history.push(msg);
          // DOM 스왑 시 너비 깜빡임 방지:
          // setCurrentSpeaker(null) 과 setMessages 를 같은 배치에 넣고
          // resetTypewriter 는 다음 이벤트루프에서 실행 (displayedText가 full text인 상태로 스왑됨)
          setMessages((prev) => [...prev, msg]);
          setCurrentSpeaker(null);
          // 발화 횟수 카운트 (정병기 제외)
          if (speaker !== 'jungbyeongki') {
            speakerCountRef.current[speaker as string] = (speakerCountRef.current[speaker as string] ?? 0) + 1;
          }
          setTimeout(() => resetTypewriter(), 0);

          // 짤방 트리거 체크 (정병기 제외, 5턴 이후부터, 20% 기본 확률)
          if (speaker !== 'jungbyeongki' && turn >= 5 && Math.random() < 0.22) {
            const meme = findMatchingMeme(text, speaker, recentMemeIdsRef.current);
            if (meme) {
              recentMemeIdsRef.current = [...recentMemeIdsRef.current.slice(-8), meme.id];
              // 짤방 보내는 멤버 결정
              const memeSpeaker = meme.sentBy === 'any'
                ? (MEMBER_ORDER[Math.floor(Math.random() * MEMBER_ORDER.length)] ?? speaker)
                : (meme.sentBy as SpeakerId);
              await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
              const memeMsg: ChatMessage = {
                speaker: memeSpeaker,
                text: meme.caption,
                timestamp: Date.now(),
                memeId: meme.id,
              };
              history.push(memeMsg);
              setMessages((prev) => [...prev, memeMsg]);

              // 짤방 반응: 보낸 멤버 제외한 다른 멤버들이 1-2개 반응 메시지 전송
              const memeReactionPool = [
                'ㅋㅋㅋㅋ 😂', '아 진짜ㅋㅋㅋ', '이거 왜 저장돼있어ㅋㅋ', '미쳐ㅋㅋㅋ',
                'ㅋㅋㅋ 뭐야', '뭐야이게ㅋㅋㅋ', 'ㄹㅇ ㅋㅋ', 'ㅋㅋ 나 저거 알아',
                '어디서 구한 거야 ㅋㅋㅋ', '😂😂 진짜',
              ];
              const reactors = MEMBER_ORDER.filter(id => id !== memeSpeaker);
              if (reactors.length > 0) {
                const numReactions = 1 + Math.floor(Math.random() * 2); // 1 or 2
                const shuffledReactors = [...reactors].sort(() => Math.random() - 0.5);
                for (let r = 0; r < Math.min(numReactions, shuffledReactors.length); r++) {
                  await new Promise((res) => setTimeout(res, 900 + Math.random() * 700));
                  const reactor = shuffledReactors[r]!;
                  const reaction = memeReactionPool[Math.floor(Math.random() * memeReactionPool.length)]!;
                  const reactionMsg: ChatMessage = { speaker: reactor, text: reaction, timestamp: Date.now() };
                  history.push(reactionMsg);
                  setMessages((prev) => [...prev, reactionMsg]);
                }
              }
            }
          }

          // small pause between turns
          await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
        } catch (e) {
          if ((e as Error).name === 'AbortError') break;
          console.error('Turn error:', e);
          break;
        }
      }

      // 이 runConversation이 여전히 "현재" 실행인지 확인 후에만 완료 처리
      // (timer abort → setTimeout 패스 → 새 주제 선택 → 구 loop 끝나며 setIsDone(true) 덮어쓰는 경쟁 조건 방지)
      if (runGenRef.current === myGen) {
        setIsDone(true);
      }
      setCurrentSpeaker(null);
      resetTypewriter();
    },
    [getNextSpeaker, streamTurn, resetTypewriter],
  );

  // start on topic select
  const handleTopicSelect = (topicId: string) => {
    abortRef.current?.abort();
    setTopic(topicId);
    startTimer();
    runConversation(topicId);
  };

  // 팬 끼어들기: 메시지를 현재 대화 히스토리에 삽입
  const handleFanSubmit = () => {
    if (!fanInput.trim() || !topic) return;
    const fanMsg: ChatMessage = {
      speaker: 'fan',
      text: fanInput.trim(),
      timestamp: Date.now(),
    };
    // fanPendingRef에만 저장 → runConversation 루프가 현재 멤버 턴 완료 후 messages에 추가
    // (즉시 setMessages 하면 현재 스트리밍 말풍선 위에 끼어드는 버그)
    fanPendingRef.current.push(fanMsg);
    setFanInput('');
  };


  const handleRestart = () => {
    abortRef.current?.abort();
    runGenRef.current++; // 이전 runConversation이 나중에 setIsDone(true) 호출하는 것을 막음
    clearTimer();
    setTimeLeft(300);
    setTopic(null);
    setMessages([]);
    resetTypewriter();
    setCurrentSpeaker(null);
    setIsDone(false);
    fanPendingRef.current = [];
    triggerTopicRef.current = null;
    setFanInput('');
  };

  const currentTopicData = TOPICS.find((t) => t.id === topic);

  // Room not found guard
  if (!room) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-700 mb-2">Room not found 😢</p>
          <button onClick={() => navigate('/')} className="text-pink-500 underline">Back to home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh-safe bg-gray-100 flex justify-center">
    <div className="w-full bg-white flex flex-col min-h-dvh-safe" style={{ maxWidth: '750px' }}>
      {/* Header — 1:1 채팅과 동일한 그라디언트 스타일 */}
      <div
        className="sticky top-0 z-20"
        style={{ background: room?.gradient || 'linear-gradient(135deg, #7C3AED, #FF6B9D)' }}
      >
        <div className="w-full px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => {
              abortRef.current?.abort();
              navigate('/');
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 active:bg-white/30 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">{room?.title || 'CHAT ROOM'} 🎵</h1>
            <p className="text-[11px] text-white/80">{MEMBER_ORDER.map(id => MEMBERS[id]?.name).filter(Boolean).join(' · ')}</p>
          </div>
          {currentTopicData && (
            <>
              <span className="px-2.5 py-1 rounded-full bg-white/25 text-[11px] font-bold text-white">
                {currentTopicData.emoji} {currentTopicData.label}
              </span>
              <span
                className="px-2 py-1 rounded-full bg-white/25 text-[11px] font-bold tabular-nums"
                style={{ color: timeLeft < 60 ? '#FCA5A5' : 'white' }}
              >
                {formatTimer(timeLeft)} ⏱
              </span>
            </>
          )}
        </div>
      </div>

      {/* Chat body */}
      <div className="flex-1 w-full px-3 pb-32">
        {/* Topic selector */}
        {!topic && (
          <div className="pt-8 space-y-4 animate-fade-in">
            {/* Member row */}
            <div className="flex justify-center gap-5 pb-4">
              {MEMBER_ORDER.map((id: string, memberIdx: number) => {
                const m = MEMBERS[id];
                if (!m) return null;
                return (
                  <div key={id} className="flex flex-col items-center gap-2">
                    <MemberAvatar member={m} size="xl" priority={memberIdx < 4} />
                    <span className="text-[14px] font-bold text-gray-900">{m.name}</span>
                    <span
                      className="text-[11px] font-semibold leading-tight text-center"
                      style={{ color: m.color, maxWidth: '72px', wordBreak: 'break-word', overflowWrap: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {m.role}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-sm text-gray-700 mb-2">Pick a 5-min chat topic!</p>
            {/* 4열 3줄 고정 */}
            <div className="grid grid-cols-4 gap-2 w-full">
              {TOPICS.map((t: GroupTopic) => (
                <button
                  key={t.id}
                  onClick={() => handleTopicSelect(t.id)}
                  className="px-2.5 py-2 rounded-xl text-xs font-medium bg-white hover:bg-gray-50 transition-all active:scale-95 shadow-sm text-center leading-tight"
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat area */}
        {topic && (
          <div className="pt-4 space-y-0.5 animate-fade-in-up">
            {/* Date divider */}
            <div className="text-center py-3">
              <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-[11px] text-gray-500">
                {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
              </span>
            </div>

            {/* Messages */}
            {messages.map((msg, i) => {
              const prevMsg = i > 0 ? messages[i - 1] : null;
              const showName = !prevMsg || prevMsg.speaker !== msg.speaker;

              // 팬 메시지 (오른쪽 정렬, 보라/핑크 그라디언트)
              if (msg.speaker === 'fan') {
                return (
                  <div key={i} className="flex justify-end items-end gap-1.5 mt-2">
                    <span className="text-[10px] text-gray-500 self-end pb-0.5">You</span>
                    <div
                      className="px-3 py-2 rounded-2xl rounded-br-sm text-sm text-white shadow max-w-[75%] leading-relaxed"
                      style={{ background: 'linear-gradient(135deg, #7C3AED, #FF6B9D)' }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              }

              // 짤방 메시지
              if (msg.memeId) {
                const memeData = MEMES.find((m) => m.id === msg.memeId);
                const sender = msg.speaker === 'jungbyeongki'
                  ? { name: '정병기', color: '#2563EB', id: 'jungbyeongki' }
                  : (() => { const m = MEMBERS[msg.speaker]; return { name: m?.name || '', color: m?.color || '#888', id: msg.speaker }; })();
                if (memeData) {
                  return (
                    <div key={i} className={showName ? 'mt-3' : 'mt-1'}>
                      <MemeCard
                        meme={memeData}
                        senderMember={sender}
                        showSenderName={showName}
                      />
                    </div>
                  );
                }
              }

              // 정병기 대표: 오른쪽 정렬
              if (msg.speaker === 'jungbyeongki') {
                return (
                  <div key={i} className="flex items-end gap-2 justify-end mt-3">
                    <div className="flex-1 min-w-0 flex flex-col items-end">
                      <span className="text-[12px] font-bold mr-1 mb-1" style={{ color: '#2563EB' }}>
                        정병기 대표 👔
                      </span>
                      <div className="flex items-end gap-1.5">
                        <span className="text-[10px] text-gray-500 shrink-0 pb-0.5">{formatTime(msg.timestamp)}</span>
                        <div className="px-3 py-2 rounded-2xl rounded-br-sm bg-[#DBEAFE] text-sm text-gray-800 leading-relaxed shadow max-w-[80%]">
                          {renderMessageText(msg.text)}
                        </div>
                      </div>
                    </div>
                    <div className="w-10 shrink-0">
                      <img src="/jungbyeongki.jpg" className="w-10 h-10 rounded-full object-cover shadow-sm" alt="정병기 대표" />
                    </div>
                  </div>
                );
              }

              const m = MEMBERS[msg.speaker];
              if (!m) return null;
              return (
                <div key={i} className={`flex items-end gap-2 ${showName ? 'mt-3' : 'mt-0.5'}`}>
                  <div className="w-10 shrink-0 self-end transition-all duration-300">
                    {showName && <MemberAvatar member={m} size="sm" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {showName && (
                      <span className="text-[12px] font-bold ml-1 mb-1 block" style={{ color: m.color }}>
                        {m.name}
                      </span>
                    )}
                    <div className="flex items-end gap-1.5">
                      <div className="px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-800 leading-relaxed shadow-sm max-w-[80%]" style={{ backgroundColor: `${m.color}18` }}>
                        {renderMessageText(msg.text)}
                      </div>
                      <span className="text-[10px] text-gray-500 shrink-0 pb-0.5">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Streaming bubble + Typing indicator (통합 — avatar를 같은 트리 위치에 고정해 깜빡임 방지) */}
            {currentSpeaker && (() => {
              const isJbk = currentSpeaker === 'jungbyeongki';
              const lastMsg = messages[messages.length - 1];
              const showName = !lastMsg || lastMsg.speaker !== currentSpeaker;
              const showBubble = !!displayedText;

              if (isJbk) {
                return (
                  <div className="flex items-end gap-2 justify-end mt-3">
                    <div className="flex-1 min-w-0 flex flex-col items-end">
                      <span className="text-[12px] font-bold mr-1 mb-1" style={{ color: '#2563EB' }}>정병기 대표 👔</span>
                      <div className="flex items-end gap-1.5">
                        <span className="text-[10px] text-gray-500 shrink-0 pb-0.5 invisible">{formatTime(Date.now())}</span>
                        {showBubble ? (
                          <div className="px-3 py-2 rounded-2xl rounded-br-sm bg-[#DBEAFE] text-sm text-gray-800 leading-relaxed shadow max-w-[80%]">
                            {renderMessageText(displayedText)}
                          </div>
                        ) : (
                          <div className="px-3.5 py-3 rounded-2xl rounded-br-sm bg-[#DBEAFE] inline-flex gap-1 items-center shadow">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-10 shrink-0">
                      <img src="/jungbyeongki.jpg" className="w-10 h-10 rounded-full object-cover shadow-sm" alt="정병기 대표" />
                    </div>
                  </div>
                );
              }

              const m = MEMBERS[currentSpeaker];
              if (!m) return null;
              return (
                <div className={`flex items-end gap-2 ${showName ? 'mt-3' : 'mt-0.5'}`}>
                  {/* avatar: items-end → 버블 하단에 맞춰 부드럽게 이동 */}
                  <div className="w-10 shrink-0 self-end transition-all duration-300">
                    {showName && <MemberAvatar member={m} size="sm" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {showName && (
                      <span className="text-[12px] font-bold ml-1 mb-1 block" style={{ color: m.color }}>
                        {m.name}
                      </span>
                    )}
                    <div className="flex items-end gap-1.5">
                      {showBubble ? (
                        <div className="px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-800 leading-relaxed shadow-sm max-w-[80%]" style={{ backgroundColor: `${m.color}18` }}>
                          {renderMessageText(displayedText)}
                        </div>
                      ) : (
                        <div className="px-3.5 py-3 rounded-2xl rounded-bl-sm inline-flex gap-1 items-center shadow-sm" style={{ backgroundColor: `${m.color}18` }}>
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: m.color, animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: m.color, animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: m.color, animationDelay: '300ms' }} />
                        </div>
                      )}
                      <span className="text-[10px] text-gray-500 shrink-0 pb-0.5 invisible">
                        {formatTime(Date.now())}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Done state */}
            {isDone && (
              <div className="text-center py-6 space-y-3 animate-fade-in">
                <p className="text-sm text-gray-600">{timeLeft === 0 ? "Time's up ⏰" : 'Chat ended! 🎤'}</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleRestart}
                    className="px-5 py-2.5 rounded-full text-sm font-bold bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    새 주제로 시작 🔄
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="px-5 py-2.5 rounded-full text-sm font-medium bg-white text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                  >
                    홈으로
                  </button>
                </div>
              </div>
            )}

            {/* 하단 고정 입력바가 마지막 메시지를 가리지 않도록 여백 확보 */}
            <div style={{ height: '90px' }} />
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* 팬 끼어들기 입력 바 — 채팅 진행 중에만 표시 */}
      {topic && !isDone && (
        <div className="sticky bottom-0 z-10 w-full px-3 py-2 bg-white border-t border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5">
            <input
              ref={fanInputRef}
              type="text"
              value={fanInput}
              onChange={(e) => setFanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleFanSubmit();
                }
              }}
              placeholder="Join the chat..."
              className="flex-1 text-[13px] bg-transparent outline-none text-gray-700 placeholder-gray-400 min-w-0"
            />
            <button
              onClick={handleFanSubmit}
              disabled={!fanInput.trim()}
              className="shrink-0 text-[12px] font-bold text-white px-2.5 py-1 rounded-full transition-all active:scale-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #FF6B9D)' }}
            >
              투척
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
