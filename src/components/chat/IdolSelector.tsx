import { APP_SUBTITLE } from '@/constants/idol-defaults';
import { useState } from 'react';
import type { IdolMeta } from '@/types/idol';
import { useChatStore } from '@/stores/chat-store';
import { useNavigate, useLocation } from 'react-router';
import { AppHeader } from '../AppHeader';
import { GROUP_ROOMS, ALL_MEMBERS, type RoomMember } from '@/constants/group-rooms';
import { SkeletonCard } from './SkeletonCard';
import FeedPage from '@/pages/FeedPage';
import DiaryPage from '@/pages/DiaryPage';
import PulsePage from '../../pages/PulsePage';
import CommunityPage from '@/pages/CommunityPage';
import SiteFooter from '@/components/SiteFooter';

interface Props {
  idols: IdolMeta[];
}

function getInitials(name: string): string {
  return name.slice(0, 1);
}

const IDOL_S_NUMBERS: Record<string, string> = {
  mizyu: 'AG!',
  rin: 'AG!',
  suzuka: 'AG!',
  kanon: 'AG!',
  nako: '歌手・女優',
  nana: 'タレント',
  taiyo: '俳優・歌手',
  yoshiaki: 'モデル・俳優',
  michi: 'モデル・タレント',
};

type Tab = 'group' | 'solo' | 'feed' | 'diary' | 'community' | 'pulse' | 'onair';

export default function IdolSelector({ idols }: Props) {
  const setCurrentIdol = useChatStore((s) => s.setCurrentIdol);
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab: Tab =
    location.pathname === '/' || location.pathname.startsWith('/onair') ? 'onair'
    : location.pathname.startsWith('/feed') ? 'feed'
    : location.pathname.startsWith('/rooms') ? 'group'
    : location.pathname.startsWith('/chat') ? 'solo'
    : location.pathname.startsWith('/community') ? 'community'
    : location.pathname.startsWith('/pulse') ? 'pulse'
    : location.pathname.startsWith('/diary') ? 'diary'
    : 'onair'; // 기본 = 온에어 (/)
  const [loadedImgs, setLoadedImgs] = useState<Record<string, boolean>>({});
  const markLoaded = (key: string) =>
    setLoadedImgs((prev) => ({ ...prev, [key]: true }));

  return (
    <div className="premium-bg relative" style={{ minHeight: '100dvh' }}>
      {/* Floating orbs background */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div
        className="mx-auto px-4 pt-6 pb-4 relative z-10 flex flex-col"
        style={{ maxWidth: '750px', minHeight: '100%' }}
      >
        {/* Hero */}
        <AppHeader subtitle={APP_SUBTITLE} />

        {/* Tabs — order: ON AIR / FEED / CHAT / 1:1 Chat / DIARY / RADAR / Pulse */}
        {(() => {
          const tabs = [
            { tab: 'onair',     path: '/',          label: 'ON AIR' },
            { tab: 'feed',      path: '/feed',      label: 'FEED' },
            { tab: 'group',     path: '/rooms',     label: 'CHAT' },
            { tab: 'solo',      path: '/chat',      label: '1:1' },
            { tab: 'diary',     path: '/diary',     label: 'DIARY' },
            { tab: 'community', path: '/community', label: 'RADAR' },
            { tab: 'pulse',     path: '/pulse',     label: 'PULSE' },
          ] as { tab: Tab; path: string; label: string }[];
          return (
            <div
              className="flex mb-4 animate-fade-in border-b border-gray-200"
              style={{
                animationDelay: '0.12s',
              }}
            >
              {tabs.map(({ tab, path, label }) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => navigate(path)}
                    className="py-2.5 pr-5 pl-0 text-[14px] transition-all duration-200 flex items-center justify-start"
                    style={{
                      fontWeight: active ? 700 : 400,
                      color: active ? '#1a1a1a' : '#6B7280',
                      borderBottom: '2px solid transparent',
                      marginBottom: '-1px',
                      background: 'transparent',
                    }}
                  >
                    <span style={{
                      borderBottom: active ? '2px solid #1a1a1a' : '2px solid transparent',
                      paddingBottom: '10px',
                    }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* 수다방 탭 */}
        <div className={activeTab === 'group' ? 'space-y-4' : 'hidden'}>
            {GROUP_ROOMS.map((room, roomIndex) => {
              const roomMembers = room.memberIds
                .map((id) => ALL_MEMBERS[id])
                .filter((m): m is RoomMember => !!m);
              return (
                <button
                  key={room.id}
                  onClick={() => navigate(`/group/${room.id}`)}
                  className="w-full text-left group"
                >
                  <div className="idol-card glass-card rounded-2xl overflow-hidden flex items-stretch">
                    {/* 2×2 사진 그리드 - 솔로 카드처럼 좌측 플러시 (수다방: 1:1챗 대비 20% 크게) */}
                    <div className="grid grid-cols-2 gap-0 shrink-0" style={{ width: 116, height: 116 }}>
                      {roomMembers.slice(0, 4).map((m, imgIdx) => {
                        const imgKey = 'g-' + room.id + '-' + m.id;
                        const imgLoaded = Boolean(loadedImgs[imgKey]);
                        return (
                        <div
                          key={m.id}
                          className={imgLoaded ? 'overflow-hidden' : 'overflow-hidden animate-img-fade'}
                          style={{ background: m.color, animationDelay: imgLoaded ? undefined : `${imgIdx * 0.08}s` }}
                        >
                          <img
                              src={`/idols/${m.id}/profile.jpg?v=2`}
                              alt={m.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 idol-photo-breathe"
                              loading={imgIdx === 0 ? 'eager' : 'lazy'}
                              {...(imgIdx === 0 ? { fetchPriority: 'high' } : {})}
                              decoding="async"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              onLoad={() => markLoaded(imgKey)}
                              style={{
                                animationName: 'idol-breathe-2',
                                animationDuration: `${5 + imgIdx * 0.8}s`,
                                animationTimingFunction: 'ease-in-out',
                                animationIterationCount: 'infinite',
                                animationDelay: `${imgIdx * 1.1 + (roomIndex % 3) * 0.4}s`,
                                willChange: 'transform',
                              }}
                            />
                        </div>
                        );
                      })}
                    </div>

                    {/* 방 정보 — 3줄: 방이름 / 방소개 / 멤버(S번호) */}
                    <div className="flex-1 min-w-0 px-4 py-4 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-0.5 min-w-0">
                        <h3 className="font-bold text-lg tracking-tight truncate subtle-shimmer-text">
                          {room.title}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400 font-medium leading-snug">
                        {room.subtitle}
                      </p>
                      <p className="text-sm text-gray-500 truncate mt-1 leading-snug">
                        {roomMembers.map((m, i) => (
                          <span key={m.id}>
                            {i > 0 && <span className="mx-0.5">·</span>}
                            {m.name}
                          </span>
                        ))}
                      </p>
                    </div>

                    {/* 화살표 */}
                    <div className="flex items-center pr-4">
                      <svg className="w-4 h-4 text-gray-300 shrink-0 group-hover:text-pink-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
        </div>

        {/* 1:1 챗 탭 */}
        <div className={activeTab === 'solo' ? 'space-y-4' : 'hidden'}>
            {idols.length === 0 ? (
              // Show skeleton cards while loading
              Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              idols.map((idol, index) => {
                const soloKey = 's-' + idol.id;
                const soloLoaded = Boolean(loadedImgs[soloKey]);
                return (
                <button
                  key={idol.id}
                  onClick={() => setCurrentIdol(idol.id)}
                  className="w-full text-left group"
                >
                  <div
                    className="idol-card glass-card rounded-2xl overflow-hidden"
                    style={{
                      ['--idol-color' as string]: idol.themeColor,
                      ['--idol-color-secondary' as string]: idol.themeColorSecondary,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `linear-gradient(135deg, rgba(255,255,255,0.85), ${idol.themeColor}08)`;
                      e.currentTarget.style.boxShadow = `
                        0 12px 30px -6px rgba(0,0,0,0.09),
                        0 4px 12px -4px rgba(0,0,0,0.05)
                      `;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <div className="flex items-stretch">
                      {/* Avatar */}
                      <div
                        className={soloLoaded ? 'idol-image-wrapper w-24 aspect-square flex items-center justify-center text-white text-2xl font-bold shrink-0 relative' : 'idol-image-wrapper w-24 aspect-square flex items-center justify-center text-white text-2xl font-bold shrink-0 relative animate-img-fade'}
                        style={{
                          background: `linear-gradient(145deg, ${idol.themeColor}, ${idol.themeColorSecondary})`,
                          animationDelay: soloLoaded ? undefined : `${index * 0.04}s`,
                        }}
                      >
                        {(idol.profileImageUrl || idol.id) ? (
                          <img
                              src={`/idols/${idol.id}/profile.jpg?v=2`}
                              alt={idol.nameKo}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 idol-photo-breathe"
                              loading={index < 4 ? 'eager' : 'lazy'}
                              {...(index < 4 ? { fetchPriority: 'high' } : {})}
                              decoding="async"
                              onError={(e) => {
                                const img = e.currentTarget;
                                if (idol.profileImageUrl && img.src !== idol.profileImageUrl) {
                                  img.src = idol.profileImageUrl;
                                } else {
                                  img.style.display = 'none';
                                }
                              }}
                              onLoad={() => markLoaded(soloKey)}
                              style={{
                                animationName: 'idol-breathe-1',
                                animationDuration: `${4.5 + (index % 4) * 0.7}s`,
                                animationTimingFunction: 'ease-in-out',
                                animationIterationCount: 'infinite',
                                animationDelay: `${(index % 6) * 0.8}s`,
                                willChange: 'transform',
                              }}
                            />
                        ) : (
                          <span className="drop-shadow-lg">{getInitials(idol.nameKo)}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1 min-w-0">
                          <span className="font-bold text-lg tracking-tight truncate shrink-0 max-w-[140px] subtle-shimmer-text">
                            {idol.nameKo}
                          </span>
                          <span
                            className="group-pill text-[10px] font-black px-2.5 py-0.5 rounded-full text-white"
                            style={{
                              background: `linear-gradient(135deg, ${idol.themeColor}, ${idol.themeColorSecondary})`,
                            }}
                          >
                            {IDOL_S_NUMBERS[idol.id] ?? idol.group}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium">
                          {idol.nameEn}
                        </p>
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {idol.tagline}
                        </p>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center pr-4">
                        <svg className="w-4 h-4 text-gray-300 shrink-0 group-hover:text-pink-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
                );
              })
            )}
        </div>

        {/* 활동 피드 탭 */}
        <div className={activeTab === 'feed' ? '' : 'hidden'}>
          <FeedPage />
        </div>

        {/* 일기장 탭 */}
        <div className={activeTab === 'diary' ? '' : 'hidden'}>
          <DiaryPage />
        </div>

        {/* 커뮤니티 탭 */}
        <div className={activeTab === 'community' ? '' : 'hidden'}>
          <CommunityPage />
        </div>

        {/* 펄스 탭 */}
        {activeTab === 'pulse' && <PulsePage />}

        {/* Footer — 수다방/1:1챗/피드 탭 (일기장/커뮤니티는 내부에서 렌더) */}
        {activeTab !== 'diary' && activeTab !== 'community' && <SiteFooter />}
      </div>
    </div>
  );
}
