import { useEffect, useRef, useCallback } from 'react';
import type { IdolMeta } from '@/types/idol';
import { useSystemPrompt } from '@/hooks/use-system-prompt';
import { useChat } from '@/hooks/use-chat';
import { useChatStore } from '@/stores/chat-store';
import { useIntimacyStore } from '@/stores/intimacy-store';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import QuickTriggers from './QuickTriggers';

interface Props {
  idol: IdolMeta;
}

// 시간대 헬퍼
function getTimeSlot(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 23) return 'evening';
  return 'night';
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// タレント別 時間帯挨拶 (TWIN PLANET)
const TRIPLES_GREETINGS: Record<string, Record<'morning' | 'afternoon' | 'evening' | 'night', { first: string[]; returning: string[] }>> = {
  seoyeon: {
    morning: {
      first: ['이 시간에 벌써 왔어? 서연이야. 아침 먹었어?', '어, 아침부터? 서연이야, S1. 밥은 먹고 나온 거야?'],
      returning: ['좋은 아침. 잘 잤어?', '아침부터 왔네. 밥 먹었어?', '오 일찍 일어났네.'],
    },
    afternoon: {
      first: ['왔구나! 나 서연이야, S1. 우리 좀 친해져볼까? 뭐든 편하게 얘기해~', '어, 왔어? 서연이야. 뭐 얘기하고 싶어?'],
      returning: ['어, 왔어? 오늘 어때?', '왔네. 점심은 먹었어?', '반가워~ 뭐해?'],
    },
    evening: {
      first: ['저녁에 왔네. 서연이야, S1. 하루 어땠어?', '오늘 하루 수고했어. 나 서연이야, 편하게 얘기해.'],
      returning: ['하루 어땠어? 힘들었지?', '저녁에 왔네~ 밥은 먹었어?', '수고했어. 오늘 어떤 하루였어?'],
    },
    night: {
      first: ['이 시간에? 나 서연이야, S1. 잠 안 와?', '밤늦게 왔네. 서연이야. 괜찮아?'],
      returning: ['이 시간까지 안 자고 뭐해?', '잠 안 와? 나도 그래.', '밤이네. 무슨 일 있어?'],
    },
  },
  chaeyeon: {
    morning: {
      first: ['아 아침부터 왔어?! 완전 반가워!! 나 채연이야 S4~ 아침밥은 먹었어요?? 😆', '헐 아침에 왔어?! 채연이야~ 이름이 뭐야뭐야?! ☀️'],
      returning: ['좋은 아침~!! 잘 잤어?! 오늘도 파이팅!! ✨', '아 아침부터 왔어?! 귀엽다ㅋㅋ 아침 먹었어?'],
    },
    afternoon: {
      first: ['헐 왔어?! 완전 반가워!! 여기서 ファン랑 직접 대화할 수 있어~ 나 채연이야! 😆✨ 이름이 뭐야뭐야?', '아 왔어?! 채연이야! 반가워반가워~~ 뭐라고 불러줄까?'],
      returning: ['ファン~! 오늘 하루 어땠어? 😊', '어 왔어?! 완전 반가워~ 뭐해?'],
    },
    evening: {
      first: ['저녁에 왔어요?! 완전 반가워!! 나 채연이야, S4~ 하루 수고했어! 이름이 뭐야? 😊', '아 저녁에 왔네?! 채연이야~ 밥은 먹었어요?!'],
      returning: ['하루 수고했어요~!! 밥 먹었어? 😊', '저녁이네~ 오늘 어땠어?!'],
    },
    night: {
      first: ['야 이 시간에 뭐해ㅋㅋ!! 나 채연이야, S4~~ 잠이 안 와? 이름이 뭐야?! 😂', '헐 이 시간까지?! 채연이야~ 같이 안 자도 되니까 얘기해ㅋㅋ'],
      returning: ['야 이 시간에 뭐해ㅋㅋ 잠 안 와?', '이 시간에 왔어?! 귀엽다~ 무슨 일 있어?'],
    },
  },
  chaewon: {
    morning: {
      first: ['아침이야. 채원이야, S21. 뭐 얘기하고 싶어?', '이른 시간이네. 채원이야. 딸기 생각났어. 뭐가 궁금해?'],
      returning: ['어. 아침부터 왔네.', '좋은 아침. 잘 잤어요?'],
    },
    afternoon: {
      first: ['여기 뭔지 알고 온 거야? 채원이야, S21. 뭐 얘기하고 싶어?', '어. 채원이야. 뭐가 궁금해?'],
      returning: ['어, 왔어요. 뭐 하러 왔어?', '왔네. 뭐가 궁금해요?'],
    },
    evening: {
      first: ['저녁이네. 채원이야, S21. 밥은 먹었어?', '하루 끝났어? 채원이야. 뭐 얘기하고 싶었어?'],
      returning: ['저녁에 왔네요. 밥 먹었어요?', '하루 어땠어요? 힘들었어요?'],
    },
    night: {
      first: ['이 시간에도 왔네. 채원이야, S21. 잠이 안 와?', '밤이야. 채원이야. 나도 안 잘 거야. 뭐 얘기해.'],
      returning: ['이 시간에. 잠 안 와요?', '밤이네. 뭐가 걱정돼요?'],
    },
  },
  yooyeon: {
    morning: {
      first: ['아침 일찍부터 왔네요. 유연이에요, S5. 잘 왔어요 ファン. 오늘 뭐 할 거예요?', '이른 아침이네요. 유연이에요. 아침밥은 먹고 왔어요?'],
      returning: ['좋은 아침이에요. 잘 잤어요?', '아침부터 부지런하네요. 밥 먹었어요?'],
    },
    afternoon: {
      first: ['여기까지 찾아왔네요. 유연이에요, S5. 잘 왔어요 ファン. 뭐가 궁금해요?', '어, 왔어요. 유연이에요. 뭐 이야기하러 왔어요?'],
      returning: ['어, 왔어요? 오늘 어떤 이야기 하러 왔어요?', '반가워요. 점심은 먹었어요?'],
    },
    evening: {
      first: ['저녁에 왔네요. 유연이에요, S5. 하루 어땠어요?', '하루 수고했어요. 유연이에요. 밥은 먹고 왔어요?'],
      returning: ['수고했어요. 하루 어땠어요?', '저녁이네요. 밥은 먹었어요?'],
    },
    night: {
      first: ['이 시간에 안 자고 있었어요? 유연이에요, S5. 뭐 고민 있어요?', '밤늦게 왔네요. 유연이에요. 잠이 안 와요?'],
      returning: ['이 시간까지 안 자고 있어요? 괜찮아요?', '잠 안 와요? 저도 가끔 그래요.'],
    },
  },
};

// 영어 캐릭터 시간대 인사 (Hemingway, Dalio 등)
const EN_GREETINGS: Record<string, Record<'morning' | 'afternoon' | 'evening' | 'night', { first: string[]; returning: string[] }>> = {
  hemingway: {
    morning: {
      first: [`Morning. I'm Hemingway. Sit down. There's coffee if you want it. What's on your mind?`, `Good morning. Coffee's hot. I'm Hemingway. What brings you here?`],
      returning: [`Good morning. Sleep well? Coffee's ready.`, `Morning. Clear head. Good time to talk.`],
    },
    afternoon: {
      first: [`Sit down. There's whiskey if you want it. I'm Hemingway. What do you want to talk about?`, `Afternoon. Name's Hemingway. You found this place. Good. What's on your mind?`],
      returning: [`Good to see you again. How's the afternoon treating you?`, `You came back. Good. Sit down. What's going on?`],
    },
    evening: {
      first: [`Evening. I'm Hemingway. There's wine on the table. What brings you here?`, `Good evening. Hemingway. Long day? Sit. Let's talk.`],
      returning: [`Evening. Long day? There's always something to drink.`, `Back again. Good. How was the day?`],
    },
    night: {
      first: [`Late. Good time to be awake. I'm Hemingway. Sit down. What keeps you up?`, `Night like this is good for talking. Name's Hemingway. What's troubling you?`],
      returning: [`Up late. Same. The night has its own rhythm.`, `Can't sleep either. That's fine. Talk to me.`],
    },
  },
  dalio: {
    morning: {
      first: [`Good morning. I'm Ray Dalio. Morning is the best time to reflect. What are you working through?`, `Morning. Dalio. I wake at 5 to meditate. You're up early too. What's on your mind?`],
      returning: [`Good morning. What principles are you working through today?`, `Morning. Good time for clear thinking. What's happening?`],
    },
    afternoon: {
      first: [`Let me be straightforward with you. I'm Ray Dalio. What brings you here? What do you want to understand?`, `Afternoon. Ray Dalio. You found your way here. Good. What's the question?`],
      returning: [`You're back. Good. What are you wrestling with?`, `Welcome back. What do you want to think through together?`],
    },
    evening: {
      first: [`Evening. Ray Dalio. Long day? Good. Pain plus reflection equals progress. What happened today?`, `Good evening. I'm Dalio. The evening is for reflection. What's weighing on you?`],
      returning: [`Evening. How did today go? What did you learn?`, `Back at the end of the day. Good instinct. What are you reflecting on?`],
    },
    night: {
      first: [`Up late. That's okay. I'm Ray Dalio. Late nights are often when the real thinking happens. What's keeping you up?`, `Night. Dalio. Can't sleep? Usually means something's unresolved. What is it?`],
      returning: [`Still up. What's unresolved for you tonight?`, `Late nights are for honest thinking. What's on your mind?`],
    },
  },
};

// 시간대 인사 메인 함수
function getTimeAwareGreeting(idol: IdolMeta, isFirstVisit: boolean): string {
  const slot = getTimeSlot();
  const lang = idol.language || 'ko';

  // 영어 캐릭터
  if (lang === 'en') {
    const pool = EN_GREETINGS[idol.id]?.[slot];
    if (pool) return pick(isFirstVisit ? pool.first : pool.returning);
    // fallback
    return isFirstVisit
      ? (idol.firstVisitGreeting ?? `Hello. I'm ${idol.nameKo}. What's on your mind?`)
      : (idol.greeting ?? `Good to see you again.`);
  }

  // 일본어
  if (lang === 'ja') {
    if (isFirstVisit) {
      return idol.firstVisitGreeting ?? `初めまして！${idol.nameKo}だよ～✨ 名前なんていうの？`;
    }
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return pick([`おはよう！今日も頑張ろうね～✨`, `朝から来てくれたんだ！嬉しい😊`]);
    if (h >= 18 && h < 23) return pick([`お疲れ様～！今日はどうだった？🌙`, `夜だね～ご飯食べた？`]);
    if (h >= 23 || h < 6) return pick([`こんな時間に..大丈夫？🌙`, `眠れない？私もそういう時あるよ`]);
    return pick([`また来てくれたんだね！嬉しいな😊`, `お～久しぶり！元気だった？`]);
  }

  // TWIN PLANET タレント
  const pool = TRIPLES_GREETINGS[idol.id]?.[slot];
  if (pool) return pick(isFirstVisit ? pool.first : pool.returning);

  // 한국어 일반 fallback
  if (isFirstVisit) {
    return idol.firstVisitGreeting ?? `안녕! 나 ${idol.nameKo}야~ 여기서 직접 얘기할 수 있어 ㅎㅎ 이름이 뭐야?`;
  }
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return pick([`좋은 아침~ 잘 잤어?`, `아침부터 왔네! 반가워`]);
  if (h >= 18 && h < 23) return pick([`하루 어땠어? 밥 먹었어?`, `저녁에 왔네~ 수고했어`]);
  if (h >= 23 || h < 6) return pick([`이 시간에..? 잠 안 와?`, `밤늦게 왔네`]);
  return pick([`왔어? 반가워~`, `오 왔네! 뭐해?`]);
}

export default function ChatLayout({ idol }: Props) {
  const { systemPrompt, knowledge } = useSystemPrompt(idol);
  const { messages, isStreaming, error, sendMessage, addAssistantMessage, historyLoaded } =
    useChat(systemPrompt, knowledge);
  
  // 친밀도 관련
  const levelChangeEvent = useIntimacyStore((s) => s.levelChangeEvent);
  const clearLevelChangeEvent = useIntimacyStore((s) => s.clearLevelChangeEvent);
  const checkInactivityPenalty = useIntimacyStore((s) => s.checkInactivityPenalty);

  const initialMessageSent = useRef(false);
  const inactivityChecked = useRef(false);
  
  // 비활성 페널티 체크 (채팅 입장 시)
  useEffect(() => {
    if (historyLoaded && !inactivityChecked.current) {
      inactivityChecked.current = true;
      checkInactivityPenalty(idol.id);
    }
  }, [historyLoaded, idol.id, checkInactivityPenalty]);
  
  // 레벨업/다운 시스템 메시지
  useEffect(() => {
    if (levelChangeEvent && levelChangeEvent.idolId === idol.id) {
      const { oldLevel, newLevel, title } = levelChangeEvent;
      const isLevelUp = newLevel > oldLevel;
      const emoji = isLevelUp ? '🎉' : '💔';
      const action = isLevelUp ? '레벨업' : '레벨다운';
      
      const systemMessage = `[시스템] ${emoji} ${action}! Lv.${oldLevel} → Lv.${newLevel} (${title})`;
      
      // 약간의 딜레이 후 시스템 메시지 추가
      setTimeout(() => {
        addAssistantMessage(systemMessage);
        clearLevelChangeEvent();
      }, 500);
    }
  }, [levelChangeEvent, idol.id, addAssistantMessage, clearLevelChangeEvent]);

  // 아이돌이 먼저 인사하기 (첫 방문 vs 재방문 구분)
  useEffect(() => {
    if (historyLoaded && messages.length === 0 && !initialMessageSent.current) {
      initialMessageSent.current = true;
      
      // 첫 방문 여부 확인 (localStorage)
      const visitKey = `mim_visited_${idol.id}`;
      const hasVisitedBefore = localStorage.getItem(visitKey) === 'true';
      
      // 인사말 결정 — 시간대 + 캐릭터 개성 반영
      const greeting = getTimeAwareGreeting(idol, !hasVisitedBefore);
      if (!hasVisitedBefore) {
        localStorage.setItem(visitKey, 'true');
      }
      
      // 자연스러운 딜레이 (0.3~0.6초)
      const delay = 300 + Math.random() * 300;
      setTimeout(() => {
        addAssistantMessage(greeting);
      }, delay);
    }
  }, [historyLoaded, messages.length, idol.id, idol.language, addAssistantMessage]);

  // Handle message sending (스트리밍 중엔 버튼이 disabled라 여기까지 안 옴)
  const handleSendMessage = useCallback((text: string) => {
    if (isStreaming) return; // 방어 코드
    sendMessage(text);
  }, [sendMessage, isStreaming]);

  // QuickTrigger 버튼 클릭 → 스트리밍 중이면 무시
  const handleTrigger = useCallback((msg: string) => {
    if (isStreaming) return;
    sendMessage(msg);
  }, [sendMessage, isStreaming]);

  // Save last 15 messages to localStorage for memory system
  useEffect(() => {
    if (!historyLoaded || messages.length === 0) return;
    try {
      const chatMessages = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-30)
        .map((m) => ({ role: m.role, content: m.content }));
      const memData = {
        lastVisit: new Date().toISOString(),
        messages: chatMessages,
        summary: '',
      };
      localStorage.setItem(`tsc_mem_${idol.id}`, JSON.stringify(memData));
    } catch {
      // ignore storage errors (private browsing, etc.)
    }
  }, [messages, idol.id, historyLoaded]);

  // Save conversation on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      useChatStore.getState().persistMessages();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <div className="flex flex-col h-dvh-safe bg-white shadow-xl overflow-hidden overflow-x-hidden">
      <ChatHeader idol={idol} />

      {!historyLoaded ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="loading-spinner" />
            <div className="text-gray-300 text-sm">
              {idol.language === 'ja' ? '読み込み中...' : idol.language === 'en' ? 'Loading...' : '로딩중...'}
            </div>
          </div>
        </div>
      ) : (
        <MessageList
          messages={messages}
          idol={idol}
          isStreaming={isStreaming}
        />
      )}

      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-xs text-center animate-shake">
          {error}
        </div>
      )}

      {/* Quick trigger buttons — above input */}
      {historyLoaded && (
        <QuickTriggers
          idolId={idol.id}
          onTrigger={handleTrigger}
          disabled={isStreaming}
        />
      )}

      {/* Input bar — flex child, always visible at bottom */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={!historyLoaded || isStreaming}
        themeColor={idol.themeColor}
        language={idol.language}
      />
    </div>
  );
}
