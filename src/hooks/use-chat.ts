import { useCallback, useRef } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useIntimacyStore } from '@/stores/intimacy-store';
import { streamChat } from '@/lib/anthropic-client';
import { getRelevantContext } from '@/lib/keyword-rag';
import { calculateEngagement, shouldReact } from '@/lib/engagement';
import type { KnowledgeCategory } from '@/types/idol';


// AI 응답 품질 분석 → 보너스 EXP (0~2)
function analyzeResponseQuality(response: string): number {
  let bonus = 0;
  
  // 이모지 2개 이상 → +1
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu;
  const emojis = response.match(emojiRegex);
  if (emojis && emojis.length >= 2) {
    bonus += 1;
  }
  
  // 응답 길이 100자 이상 → +1
  if (response.length >= 100) {
    bonus += 1;
  }
  
  // 긍정 표현 포함 → +1 (최대 보너스 2로 제한)
  const positivePatterns = [
    /ㅋㅋ+/, /ㅎㅎ+/, /좋아/, /대박/, /최고/, /진짜/, /완전/,
    /사랑/, /귀여/, /멋있/, /잘했/, /고마워/, /반가워/, /보고 ?싶/,
  ];
  const hasPositive = positivePatterns.some(p => p.test(response));
  if (hasPositive && bonus < 2) {
    bonus += 1;
  }
  
  // 최대 보너스 2로 제한
  return Math.min(bonus, 2);
}

export function useChat(systemPrompt: string, knowledge?: Record<KnowledgeCategory, string> | null) {
  const messages = useChatStore((s) => s.messages);
  const currentIdolId = useChatStore((s) => s.currentIdolId);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const error = useChatStore((s) => s.error);
  const historyLoaded = useChatStore((s) => s.historyLoaded);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateLastAssistantMessage = useChatStore(
    (s) => s.updateLastAssistantMessage,
  );
  const setStreaming = useChatStore((s) => s.setStreaming);
  const setError = useChatStore((s) => s.setError);
  const persistMessages = useChatStore((s) => s.persistMessages);
  const markUserMessagesAsRead = useChatStore((s) => s.markUserMessagesAsRead);
  const addReactionToLastUserMessage = useChatStore((s) => s.addReactionToLastUserMessage);
  
  // 친밀도 관련
  const onMessageSent = useIntimacyStore((s) => s.onMessageSent);
  const onReactionReceived = useIntimacyStore((s) => s.onReactionReceived);
  const onGoodResponse = useIntimacyStore((s) => s.onGoodResponse);
  const clearLevelChangeEvent = useIntimacyStore((s) => s.clearLevelChangeEvent);
  
  // 메시지 큐잉 (AI 응답 중 입력한 메시지 저장)
  const pendingMessageRef = useRef<string | null>(null);

  // Add assistant message directly (for greeting/onboarding flow)
  // Use old timestamp to skip typing animation
  const addAssistantMessage = useCallback(
    (text: string) => {
      const { messages: currentMessages } = useChatStore.getState();
      const newMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: text,
        timestamp: Date.now(), // 현재 시각 → shouldAnimate=true → 타이핑 애니메이션 적용
      };
      useChatStore.setState({ 
        messages: [...currentMessages, newMessage] 
      });
      setTimeout(() => persistMessages(), 50);
    },
    [persistMessages],
  );

  // Add user message directly (for onboarding flow, bypasses isStreaming check)
  const addUserMessage = useCallback(
    (text: string) => {
      addMessage('user', text.trim());
      setTimeout(() => persistMessages(), 50);
    },
    [addMessage, persistMessages],
  );

  const sendMessage = useCallback(
    async (text: string, skipAI = false) => {
      if (!text.trim()) return;
      
      // AI 응답 중이면 큐에 저장하고 리턴
      if (isStreaming) {
        pendingMessageRef.current = text;
        return;
      }

      setError(null);
      addMessage('user', text.trim());
      
      // 친밀도 EXP 획득 (메시지 전송 시)
      if (currentIdolId) {
        onMessageSent(currentIdolId);
        
        // 레벨 변동 발생 시 시스템 메시지 추가
        const event = useIntimacyStore.getState().levelChangeEvent;
        if (event && event.idolId === currentIdolId) {
          const direction = event.newLevel > event.oldLevel ? '🎉' : '💔';
          const arrow = event.newLevel > event.oldLevel ? '▲' : '▼';
          const systemContent = `${direction} Lv.${event.oldLevel} ${arrow} Lv.${event.newLevel} (${event.title})`;
          
          // system 메시지 추가
          const { messages: currentMsgs } = useChatStore.getState();
          useChatStore.setState({
            messages: [...currentMsgs, {
              id: crypto.randomUUID(),
              role: 'system' as const,
              content: systemContent,
              timestamp: Date.now(),
            }]
          });
          
          clearLevelChangeEvent();
        }
      }

      // If skipAI, just add user message and return
      if (skipAI) {
        setTimeout(() => persistMessages(), 50);
        return;
      }

      // Need systemPrompt for AI call
      if (!systemPrompt) return;

      // 전송 즉시 스트리밍 상태로 전환 (버튼 비활성화)
      setStreaming(true);

      // 잠시 후 타이핑 인디케이터 등장 (동시에 뜨면 어색)
      const readingDelay = 400 + Math.random() * 400; // 0.4~0.8초
      await new Promise(resolve => setTimeout(resolve, readingDelay));

      // 딜레이 후 typing dots 표시
      addMessage('assistant', '');

      const conversationMessages = [
        // system 메시지는 AI 컨텍스트에서 제외 (레벨업 알림 등은 순수 UI용)
        ...messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: text.trim() },
      ];

      // 🔍 키워드 RAG: 사용자 메시지에서 키워드 감지하고 관련 정보 추가
      let enhancedSystemPrompt = systemPrompt;
      if (knowledge) {
        const relevantContext = getRelevantContext(text, knowledge as Record<string, string>);
        if (relevantContext) {
          enhancedSystemPrompt = systemPrompt + relevantContext;
          console.log('[RAG] 관련 컨텍스트 추가됨:', relevantContext.slice(0, 200) + '...');
        }
      }

      await streamChat({
        systemPrompt: enhancedSystemPrompt,
        messages: conversationMessages,
        idolId: currentIdolId || undefined, // RAG 검색용
        onChunk: (fullText) => {
          updateLastAssistantMessage(fullText);
        },
        onComplete: (fullText) => {
          // MessageBubble이 content.split('||')로 내부에서 multi-bubble 처리하므로
          // fullText 그대로 전달 — 별도 setTimeout append 불필요
          updateLastAssistantMessage(fullText);

          const runPostComplete = () => {
            setStreaming(false);
            // 읽음 표시 처리
            markUserMessagesAsRead();

            // AI 응답 품질 분석 후 총 EXP 계산
            let totalExp = 1; // 기본 1 EXP
            if (currentIdolId) {
              const { messages: currentMsgs } = useChatStore.getState();
              const lastAssistant = currentMsgs.filter(m => m.role === 'assistant').pop();
              if (lastAssistant) {
                const bonusExp = analyzeResponseQuality(lastAssistant.content);
                totalExp += bonusExp;

                // 아이돌 메시지에 expGained 추가
                useChatStore.setState((state) => ({
                  messages: state.messages.map(m =>
                    m.id === lastAssistant.id
                      ? { ...m, expGained: totalExp }
                      : m
                  )
                }));

                // 친밀도 스토어 업데이트
                onMessageSent(currentIdolId);
                if (bonusExp > 0) {
                  onGoodResponse(currentIdolId, bonusExp);
                }
              }
            }

            // AI 몰입도 기반 리액션: 응답의 감정/참여도를 분석해서 결정
            const { messages: latestMsgs } = useChatStore.getState();
            const lastAssistantMsg = latestMsgs.filter(m => m.role === 'assistant').pop();
            if (lastAssistantMsg) {
              const engagement = calculateEngagement(lastAssistantMsg.content);
              if (shouldReact(engagement)) {
                addReactionToLastUserMessage('❤️');
                // 리액션 받으면 친밀도 EXP 획득
                if (currentIdolId) {
                  onReactionReceived(currentIdolId);
                }
              }
            }
            // Save conversation to IndexedDB after each response
            // Use setTimeout to ensure state is updated first
            setTimeout(() => persistMessages(), 50);

            // 큐에 대기중인 메시지가 있으면 자동 전송
            if (pendingMessageRef.current) {
              const pendingText = pendingMessageRef.current;
              pendingMessageRef.current = null;
              // 잠시 딜레이 후 전송 (자연스러운 흐름을 위해)
              setTimeout(() => {
                sendMessage(pendingText);
              }, 100);
            }
          };

          runPostComplete();
        },
        onError: (err) => {
          setStreaming(false);
          // Remove the empty assistant placeholder
          useChatStore.setState((state) => ({
            messages: state.messages.slice(0, -1),
          }));
          // Still persist the user message
          setTimeout(() => persistMessages(), 50);
          if (err.message.includes('401')) {
            setError('Invalid API key. Please check server configuration.');
          } else {
            setError(`An error occurred: ${err.message}`);
          }
        },
      });
    },
    [
      systemPrompt,
      knowledge,
      messages,
      currentIdolId,
      isStreaming,
      addMessage,
      updateLastAssistantMessage,
      setStreaming,
      setError,
      persistMessages,
      markUserMessagesAsRead,
      addReactionToLastUserMessage,
      onMessageSent,
      onReactionReceived,
      onGoodResponse,
      clearLevelChangeEvent,
    ],
  );

  return { messages, isStreaming, error, sendMessage, addAssistantMessage, addUserMessage, historyLoaded };
}
