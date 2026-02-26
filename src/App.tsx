import { Routes, Route, Navigate } from 'react-router';
import { lazy, Suspense } from 'react';
import ChatPage from './pages/ChatPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const AdminPage = lazy(() => import('./pages/AdminPage'));
const OnAirPage = lazy(() => import('./pages/OnAirPage'));
const GroupChatPage = lazy(() => import('./pages/GroupChatPage'));

const GroupChatFallback = (
  <div
    className="flex flex-col items-center justify-center h-screen premium-bg"
    style={{ gap: '16px' }}
  >
    <div style={{ position: 'relative', width: '80px', height: '80px' }}>
      {/* center logo */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '60px', height: '60px',
        zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src="/logo.png" alt="twinplanet.chat" style={{ width: '48px', height: '48px' }} />
      </div>
      <span style={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', fontSize: '22px', animation: 'chat-emoji-pop 2.4s ease-in-out infinite', animationDelay: '0s' }}>💜</span>
      <span style={{ position: 'absolute', top: '10%', right: '-6px', fontSize: '20px', animation: 'chat-emoji-pop 2.4s ease-in-out infinite', animationDelay: '0.4s' }}>🌸</span>
      <span style={{ position: 'absolute', bottom: '10%', right: '-6px', fontSize: '20px', animation: 'chat-emoji-pop 2.4s ease-in-out infinite', animationDelay: '0.8s' }}>✨</span>
      <span style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', fontSize: '20px', animation: 'chat-emoji-pop 2.4s ease-in-out infinite', animationDelay: '1.2s' }}>⭐</span>
      <span style={{ position: 'absolute', bottom: '10%', left: '-6px', fontSize: '20px', animation: 'chat-emoji-pop 2.4s ease-in-out infinite', animationDelay: '1.6s' }}>🎶</span>
      <span style={{ position: 'absolute', top: '10%', left: '-6px', fontSize: '20px', animation: 'chat-emoji-pop 2.4s ease-in-out infinite', animationDelay: '2.0s' }}>💫</span>
    </div>
    <p className="text-sm font-semibold shimmer-text" style={{ marginTop: '8px' }}>twinplanet.chat</p>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
      {/* ── 메인 탭 라우트 ── */}
      <Route
        path="/"
        element={
          <Suspense fallback={GroupChatFallback}>
            <OnAirPage />
          </Suspense>
        }
      /> {/* 온에어 */}
      <Route path="/rooms"          element={<ChatPage />} />   {/* 수다방 */}
      <Route path="/chat"           element={<ChatPage />} />   {/* 1:1 챗 목록 */}
      <Route path="/chat/:idolId"   element={<ChatPage />} />   {/* 1:1 챗 (아이돌) */}
      <Route path="/feed"           element={<ChatPage />} />   {/* 피드 */}
      <Route path="/diary"          element={<ChatPage />} />   {/* 일기장 목록 */}
      <Route path="/diary/:date"    element={<ChatPage />} />   {/* 일기장 개별 (날짜) */}
      <Route path="/community"      element={<ChatPage />} />   {/* 커뮤니티 피드 */}
      <Route path="/pulse"          element={<ChatPage />} />   {/* 펄스 */}
      <Route path="/onair"          element={<Navigate to="/" replace />} />

      {/* ── 그룹 수다방 ── */}
      <Route
        path="/group/:roomId"
        element={
          <Suspense fallback={GroupChatFallback}>
            <GroupChatPage />
          </Suspense>
        }
      />

      {/* ── 하위 호환 리다이렉트 ── */}
      <Route path="/solo"           element={<Navigate to="/chat"  replace />} />
      <Route path="/triples"        element={<Navigate to="/group/t-squad" replace />} />

      {/* ── 어드민 ── */}
      <Route
        path="/admin/*"
        element={
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-gray-400">Loading admin...</div>
              </div>
            }
          >
            <AdminPage />
          </Suspense>
        }
      />
    </Routes>
    </ErrorBoundary>
  );
}
