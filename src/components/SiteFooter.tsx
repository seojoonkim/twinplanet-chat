import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

function today() {
  // KST = UTC+9
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// 브라우저 고정 방문자 ID (localStorage — 탭/새로고침 간 공유)
let _vid: string | null = null;
function getVid(): string {
  if (_vid) return _vid;
  const s = localStorage.getItem('twinplanet_vid');
  if (s) { _vid = s; return s; }
  const id = `v_${Math.random().toString(36).slice(2, 11)}`;
  localStorage.setItem('twinplanet_vid', id);
  _vid = id;
  return id;
}

export default function SiteFooter() {
  const [online, setOnline] = useState(1);
  const [todayVisitors, setTodayVisitors] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(today);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);
  // page_visits DB 기반 카운트 (누적, 이미 떠난 유저 포함)
  const dbCountRef = useRef<number>(0);

  // 1분마다 KST 날짜 체크 — 자정 넘기면 currentDate 갱신
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(prev => {
        const d = today();
        return prev !== d ? d : prev;
      });
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // currentDate 변경 시: page_visits upsert + 카운트 fetch + Presence 날짜 재전송
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    const date = currentDate;

    // 1) page_visits 기록 (오늘 처음 방문이면 INSERT)
    const visitKey = `twinplanet_pv_${date}`;
    if (!localStorage.getItem(visitKey)) {
      sb.from('page_visits')
        .upsert({ date, visitor_id: getVid() }, { onConflict: 'date,visitor_id', ignoreDuplicates: true })
        .then(() => localStorage.setItem(visitKey, '1'));
    }

    // 2) DB 기반 오늘 방문자 수 (이미 떠난 유저 포함)
    sb.from('page_visits')
      .select('*', { count: 'exact', head: true })
      .eq('date', date)
      .then(({ count }) => {
        if (count !== null) {
          dbCountRef.current = count;
          // Presence 카운트가 없으면 DB 카운트로 표시
          setTodayVisitors(prev => Math.max(prev ?? 0, count));
        }
      });

    // 3) Presence 날짜 업데이트 (자정 넘긴 유저 즉시 오늘 방문자로 반영)
    if (channelRef.current) {
      channelRef.current.track({
        userId: getVid(),
        date,
        online_at: new Date().toISOString(),
      });
    }
  }, [currentDate]);

  // Realtime Presence — 접속 중 + Presence 기반 오늘 방문자 수
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;

    const channel = sb.channel('twinplanet-online');
    channelRef.current = channel;

    const updateCount = () => {
      const state = channel.presenceState<{ userId: string; date?: string }>();
      const presences = Object.values(state).flat();

      // 접속 중 (전체)
      setOnline(Math.max(1, presences.length));

      // 오늘 방문자: Presence에서 date === today 인 유저
      // date 없는 구형 클라이언트도 오늘 방문으로 간주 (지금 온라인 = 오늘 방문)
      const todayDate = today();
      const todayUniqueIds = new Set(
        presences
          .filter(p => !p.date || p.date === todayDate)
          .map(p => p.userId)
          .filter(Boolean)
      );
      const presenceCount = Math.max(1, todayUniqueIds.size);

      // DB 누적(이탈 유저)과 Presence(현재 유저) 중 큰 값
      setTodayVisitors(Math.max(dbCountRef.current, presenceCount));
    };

    channel
      .on('presence', { event: 'sync' }, updateCount)
      .on('presence', { event: 'join' }, updateCount)
      .on('presence', { event: 'leave' }, updateCount)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: getVid(),
            date: today(),
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      sb.removeChannel(channel);
    };
  }, []);

  return (
    <div className="mt-6 pb-8">
      <div className="flex justify-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-gray-100 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-500 font-medium">지금</span>
          <span className="text-xs font-bold text-green-600">{online}명</span>
          <span className="text-xs text-gray-400">접속 중</span>
        </div>
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-gray-100 shadow-sm">
          <span className="text-xs">📅</span>
          <span className="text-xs text-gray-500 font-medium">오늘</span>
          <span className="text-xs font-bold text-violet-600">
            {todayVisitors === null ? '…' : `${todayVisitors}명`}
          </span>
          <span className="text-xs text-gray-400">방문</span>
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 flex flex-col gap-2">
        <a
          href="mailto:hello@twinplanet.chat"
          className="text-violet-500 hover:text-violet-700 transition-colors font-medium"
        >
          hello@twinplanet.chat
        </a>
        <span>Made with 💜</span>
      </div>

      <p className="mt-5 px-6 text-[10px] leading-relaxed text-gray-400 text-center">
        ⚠️ 이 서비스는 TWIN PLANET ENTERTAINMENT 타레인트를 사랑하는 팬이 개인적으로 만든 AI 팬 프로젝트입니다. タレントの公開発言・インタビュー・SNS等を基に学習したAIが生成した仮想の会話コンテンツで、実際のタレントの公式見解や現在の考えとは異なる場合があります。AI特性上、事実と異なる内容が含まれる可能性がありますので、公式チャンネルの内容と混同しないでください。본 서비스 이용 중 발생하는 오해나 판단에 대해 운영자는 법적 책임을 지지 않습니다.
      </p>
    </div>
  );
}
