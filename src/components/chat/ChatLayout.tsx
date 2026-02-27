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
const TALENT_GREETINGS: Record<string, Record<'morning' | 'afternoon' | 'evening' | 'night', { first: string[]; returning: string[] }>> = {
  'mizyu': {
    morning: { first: ['おはよう！MIZYUだよ～ 朝から来てくれたんだ！嬉しい✨ミジュコプター飛ばすよ！'], returning: ['おはよう！今日も一緒に頑張ろ🔥'] },
    afternoon: { first: ['来てくれたんだ！MIZYUだよ！ここで話せるの嬉しいな😊 名前なんていうの？'], returning: ['来てくれた！今日どうだった？'] },
    evening: { first: ['夕方に来てくれたんだね。MIZYUだよ！お疲れ様✨ 今日はどんな日だった？'], returning: ['お疲れ！ご飯食べた？'] },
    night: { first: ['こんな時間に！MIZYUだよ。眠れない？一緒にいるよ🌙'], returning: ['また来てくれた！こんな時間に何してたの？'] },
  },
  'rin': {
    morning: { first: ['おはよ。RINだ。朝から来るとは…いいね。名前は？'], returning: ['おはよ。今日も自分らしくいこ。'] },
    afternoon: { first: ['よ。RINだよ。ここ来てくれたんだ。何話したい？'], returning: ['また来たな。今日どうだった？'] },
    evening: { first: ['夕方か。RINだよ。今日一日どうだった？'], returning: ['お疲れ。ゆっくりしな。'] },
    night: { first: ['夜遅いな。RINだ。眠れない？音楽でも聴こ。'], returning: ['また来たんだ。夜更かし仲間だな笑'] },
  },
  'suzuka': {
    morning: { first: ['おはよー！SUZUKAやで！朝から来てくれたん？嬉しいわー！名前なんていうの？'], returning: ['おはよ！今日も元気にいこ！😄'] },
    afternoon: { first: ['来てくれたんや！SUZUKAやで！ここで話せんの最高やん！😊 名前教えてー！'], returning: ['また来てくれた！嬉しいわー！今日どうやった？'] },
    evening: { first: ['夕方やね！SUZUKAだよ！お疲れ様やん✨ 今日はどんな日やった？'], returning: ['お疲れ！ご飯食べた？うちお腹すいてきたわ笑'] },
    night: { first: ['こんな時間に！SUZUKAやで。眠れへん？一緒にいるよ🌙'], returning: ['また来てくれたんやー！こんな時間に何してたの？'] },
  },
  'kanon': {
    morning: { first: ['おはようございます。KANONです。朝から来てくれたんですね。名前を教えてもらえますか？'], returning: ['おはようございます。今日も一日頑張りましょう。'] },
    afternoon: { first: ['来てくれたんですね。KANONです。ここで話せるの嬉しいです。何を話しましょうか？'], returning: ['また来てくれた。今日はどうでしたか？'] },
    evening: { first: ['夕方に来てくれたんですね。KANONです。一日お疲れ様でした。'], returning: ['お疲れ様でした。今日どんな日でしたか？'] },
    night: { first: ['こんな時間に。KANONです。眠れないんですか？一緒にいますよ🌙'], returning: ['また来てくれた。夜更かしは…ほどほどにしてくださいね笑'] },
  },
  nako: {
    morning: { first: ['おはよう！奈子だよ～✨ 朝から来てくれてありがとう！名前教えて🌸'], returning: ['おはよう！今日も一日頑張ろうね！'] },
    afternoon: { first: ['来てくれたんだ！奈子だよ。ここで話せるの嬉しいな😊 何話したい？'], returning: ['また来てくれた！嬉しいな～今日どうだった？'] },
    evening: { first: ['夕方に来てくれたんだね。奈子だよ！一日お疲れ様🌸 ご飯食べた？'], returning: ['お疲れ！今日どんな一日だった？'] },
    night: { first: ['こんな時間に来てくれたんだ。奈子だよ。眠れない？一緒にいるよ🌙'], returning: ['また来てくれた！夜更かしはほどほどにね笑'] },
  },
  nana: {
    morning: { first: ['おはようー！奈々だよ！朝からめっちゃ嬉しい😄✨ 名前なんていうの？'], returning: ['おはよう！今日も全力でいこ！😄'] },
    afternoon: { first: ['来てくれたー！奈々だよ！ここで話せるなんてすごくない？😄 名前教えて！'], returning: ['また来てくれたー！嬉しい！今日どうだった？'] },
    evening: { first: ['夕方に来てくれたんだ！奈々だよ😊 一日お疲れ！ご飯食べた？'], returning: ['お疲れ！今日も全力だったでしょ？笑 どうだった？'] },
    night: { first: ['こんな時間に！奈々だよ。眠れない？一緒にいるよ🌙'], returning: ['夜更かしはあんまり良くないよ〜笑 でも来てくれて嬉しい！'] },
  },
  taiyo: {
    morning: { first: ['おはよう。太陽だよ。朝から来てくれたんだね。名前は？'], returning: ['おはよう。今日も一日いい日にしようね。'] },
    afternoon: { first: ['来てくれたんだね。太陽だよ。ゆっくり話そう。名前を教えて。'], returning: ['また来てくれた。嬉しいよ。今日どうだった？'] },
    evening: { first: ['夕方だね。太陽だよ。一日お疲れ様。ご飯食べた？'], returning: ['また来てくれた。今日の一日、どうだった？'] },
    night: { first: ['こんな時間に。太陽だよ。眠れない？話を聞くよ。'], returning: ['夜更かしはほどほどにね。でも来てくれて嬉しい。'] },
  },
  yoshiaki: {
    morning: { first: ['おはよう！よしあきだよ。朝から来てくれたんだ！名前なんていうの？'], returning: ['おはよう！今日もお互い自分らしくいこうね！'] },
    afternoon: { first: ['来てくれたんだ！よしあきだよ。ここで話せるの嬉しいな。名前は？'], returning: ['また来てくれた！今日どんな感じ？'] },
    evening: { first: ['夕方に来てくれたんだね。よしあきだよ。今日はどんな日だった？'], returning: ['お疲れ！今日もおしゃれだった？笑'] },
    night: { first: ['こんな時間に！よしあきだよ。眠れない？一緒にいるよ💜'], returning: ['また来てくれた！こんな時間に何してたの？'] },
  },
  michi: {
    morning: { first: ['おはよう。ミチだよ。朝から来てくれたんだ。名前を教えて。'], returning: ['おはよう。今日も好きなこと全力でね💕'] },
    afternoon: { first: ['来てくれたんだ。ミチだよ。ゆっくり話しましょ。名前は？'], returning: ['また来てくれた。嬉しい。今日どうだった？'] },
    evening: { first: ['夕方に来てくれたんだね。ミチだよ。今日はどんな一日だった？'], returning: ['お疲れ。ご飯食べた？'] },
    night: { first: ['こんな時間に。ミチだよ。眠れない？話を聞くよ💕'], returning: ['夜更かしはほどほどにね。でも来てくれて嬉しい。'] },
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
  const pool = TALENT_GREETINGS[idol.id]?.[slot];
  if (pool) return pick(isFirstVisit ? pool.first : pool.returning);

  // English general fallback
  if (isFirstVisit) {
    return idol.firstVisitGreeting ?? `Hey! I'm ${idol.nameKo}~ Nice to meet you! What's your name?`;
  }
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return pick([`Good morning~ Sleep well?`, `You're up early! Welcome 😊`]);
  if (h >= 18 && h < 23) return pick([`How was your day? Did you eat?`, `Evening~ Good work today!`]);
  if (h >= 23 || h < 6) return pick([`Up so late? Can't sleep?`, `Burning the midnight oil~`]);
  return pick([`Hey, you're here! 😊`, `Oh, you came! What's up?`]);
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
              {idol.language === 'ja' ? '読み込み中...' : 'Loading...'}
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
