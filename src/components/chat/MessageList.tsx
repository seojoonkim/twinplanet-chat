import { useEffect, useRef, useCallback } from 'react';
import type { Message } from '@/types/chat';
import type { IdolMeta } from '@/types/idol';
import MessageBubble from './MessageBubble';

interface Props {
  messages: Message[];
  idol: IdolMeta;
  isStreaming: boolean;
}

export default function MessageList({ messages, idol, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 공통 snap 함수 — smooth 없이 즉시 이동
  const snapToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  // 새 버블 등장 / 타이핑 진행 시 호출
  const handleBubbleReveal = useCallback(() => {
    snapToBottom();
    requestAnimationFrame(snapToBottom);
  }, [snapToBottom]);

  // 메시지 추가 시 스크롤 (DOM 렌더링 완료 대기 포함)
  useEffect(() => {
    snapToBottom();
    const raf = requestAnimationFrame(snapToBottom);
    const t1 = setTimeout(snapToBottom, 80);
    const t2 = setTimeout(snapToBottom, 220);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [messages.length, snapToBottom]);

  // 스트리밍 중 지속 스크롤
  useEffect(() => {
    if (!isStreaming) return;
    snapToBottom();
    const interval = setInterval(snapToBottom, 60);
    return () => clearInterval(interval);
  }, [isStreaming, snapToBottom]);

  // 스트리밍 종료 후 최종 스크롤
  useEffect(() => {
    if (isStreaming) return;
    const t1 = setTimeout(snapToBottom, 100);
    const t2 = setTimeout(snapToBottom, 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isStreaming, snapToBottom]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-5 pb-4 custom-scrollbar">
      {/* Welcome message area */}
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg animate-scale-in overflow-hidden ring-2 ring-white/50"
            style={{
              background: `linear-gradient(135deg, ${idol.themeColor}, ${idol.themeColorSecondary})`,
            }}
          >
            {idol.profileImageUrl ? (
              <img
                src={idol.profileImageUrl}
                alt={idol.nameKo}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              idol.nameKo.slice(0, 1)
            )}
          </div>
          <h2
            className="text-lg font-bold text-gray-700 animate-fade-in-up"
            style={{ animationDelay: '0.1s', opacity: 0 }}
          >
            {idol.nameKo}
          </h2>
          <p
            className="text-sm text-gray-400 mt-1 animate-fade-in-up"
            style={{ animationDelay: '0.2s', opacity: 0 }}
          >
            {idol.tagline}
          </p>
          <p
            className="text-xs text-gray-300 mt-5 animate-fade-in-up"
            style={{ animationDelay: '0.35s', opacity: 0 }}
          >
            Send a message to start chatting!
          </p>
        </div>
      )}

      {/* Messages - 시스템 트리거만 필터링, 나머지는 MessageBubble이 처리 */}
      {messages
        .filter((msg) => !(msg.role === 'user' && msg.content.startsWith('[시스템:')))
        .map((msg, idx, arr) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            idol={idol} 
            isNew={isStreaming && idx === arr.length - 1 && msg.role === 'assistant'}
            onBubbleReveal={handleBubbleReveal}
          />
        ))}

      <div ref={bottomRef} />
    </div>
  );
}
