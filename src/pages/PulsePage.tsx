import { useEffect, useMemo, useState } from 'react';

interface PulsePost {
  id: string;
  title: string;
  content: string;
  author_name: string;
  views: number;
  likes: number;
  comments_count: number;
  created_at: string;
}

interface PulseComment {
  id: string;
  post_id: string;
  content: string;
  author_name: string;
  created_at: string;
  member_id?: string;
  is_member_comment?: boolean;
}

interface WriteFormState {
  author_name: string;
  author_password: string;
  title: string;
  content: string;
}

interface CommentFormState {
  author_name: string;
  author_password: string;
  content: string;
}

type View = 'list' | 'detail' | 'write';

const cardShadow = { boxShadow: '0 2px 16px rgba(109,40,217,0.08), 0 1px 4px rgba(109,40,217,0.04)' };
const IDOL_NICKNAMES = [
  '코스모스_별빛',
  '서연이좋아',
  '혜린맘',
  '채연덕후',
  '지우팬',
  '수민짱',
  '유연러버',
  '트리플에스마스터',
  '별빛스밍',
  '코딱지',
  '제발컴백',
  '우주덕',
  '나경이사랑해',
  '유빈응원단',
];
const CUTE_PASSWORDS = [
  '별빛123',
  '하트999',
  '보라해777',
  '코스모스♡',
  '스밍중456',
  '덕질중888',
  '트리플에스💜',
  '팬심폭발321',
  '응원해555',
  '최애최애999',
];
const LS_NAME_KEY = 'pulse_author_name';
const LS_PW_KEY = 'pulse_author_password';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return '방금';
  if (mins < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

function getHeaders(): Record<string, string> {
  if (!SUPABASE_ANON_KEY) {
    return {};
  }

  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

function isConfigMissing() {
  return !SUPABASE_URL || !SUPABASE_ANON_KEY;
}

const PulsePage = () => {
  const defaultNickname = useMemo(() => {
    return localStorage.getItem(LS_NAME_KEY) || IDOL_NICKNAMES[Math.floor(Math.random() * IDOL_NICKNAMES.length)] || '코스모스_별빛';
  }, []);
  const defaultPassword = useMemo(() => {
    return localStorage.getItem(LS_PW_KEY) || CUTE_PASSWORDS[Math.floor(Math.random() * CUTE_PASSWORDS.length)] || '별빛123';
  }, []);

  const [view, setView] = useState<View>('list');
  const [posts, setPosts] = useState<PulsePost[]>([]);
  const [selectedPost, setSelectedPost] = useState<PulsePost | null>(null);
  const [comments, setComments] = useState<PulseComment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [writeForm, setWriteForm] = useState<WriteFormState>(() => {
    const initialNickname = defaultNickname || '코스모스_별빛';
    const initialPassword = defaultPassword || '별빛123';

    return {
      author_name: initialNickname,
      author_password: initialPassword,
      title: '',
      content: '',
    };
  });
  const [commentForm, setCommentForm] = useState<CommentFormState>({
    author_name: defaultNickname,
    author_password: defaultPassword,
    content: '',
  });

  const fetchPosts = async () => {
    if (isConfigMissing()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/pulse_posts?select=*&order=created_at.desc&limit=50`,
        {
          headers: getHeaders(),
        },
      );
      if (!res.ok) {
        throw new Error(`게시글을 불러오지 못했습니다 (${res.status})`);
      }
      const data = (await res.json()) as PulsePost[];
      setPosts(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (postId: string) => {
    if (isConfigMissing()) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/pulse_comments?post_id=eq.${postId}&order=created_at.asc`,
        {
          headers: getHeaders(),
        },
      );
      if (!res.ok) {
        throw new Error(`댓글을 불러오지 못했습니다 (${res.status})`);
      }
      const data = (await res.json()) as PulseComment[];
      setComments(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    if (view === 'list') {
      fetchPosts();
    }
  }, [view]);

  const openDetail = (post: PulsePost) => {
    fetch(`${SUPABASE_URL}/rest/v1/pulse_posts?id=eq.${post.id}`, {
      method: 'PATCH',
      headers: { ...getHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify({ views: (post.views || 0) + 1 }),
    });
    setPosts(prev => prev.map(p => (p.id === post.id ? { ...p, views: (post.views || 0) + 1 } : p)));
    setSelectedPost(post);
    setView('detail');
    fetchComments(post.id);
  };

  const submitPost = async () => {
    if (!writeForm.author_name.trim() || !writeForm.title.trim() || !writeForm.content.trim()) {
      alert('닉네임, 제목, 본문은 필수 입력값입니다.');
      return;
    }
    if (isConfigMissing()) {
      alert('Supabase 환경변수가 설정되지 않았습니다.');
      return;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/pulse_posts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: writeForm.title.trim(),
          content: writeForm.content.trim(),
          author_name: writeForm.author_name.trim(),
          author_password: writeForm.author_password.trim(),
        }),
      });
      if (!res.ok) {
        throw new Error(`게시글 등록 실패 (${res.status})`);
      }
      localStorage.setItem(LS_NAME_KEY, writeForm.author_name.trim());
      localStorage.setItem(LS_PW_KEY, writeForm.author_password.trim());
      setWriteForm({
        author_name: writeForm.author_name.trim(),
        author_password: writeForm.author_password.trim(),
        title: '',
        content: '',
      });
      setView('list');
      await fetchPosts();
    } catch (error) {
      alert(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    }
  };

  const submitComment = async () => {
    if (!selectedPost) return;
    if (!commentForm.author_name.trim() || !commentForm.content.trim()) {
      alert('닉네임과 내용은 필수 입력값입니다.');
      return;
    }
    if (isConfigMissing()) {
      alert('Supabase 환경변수가 설정되지 않았습니다.');
      return;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/pulse_comments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          post_id: selectedPost.id,
          content: commentForm.content.trim(),
          author_name: commentForm.author_name.trim(),
          author_password: commentForm.author_password.trim(),
        }),
      });
      if (!res.ok) {
        throw new Error(`댓글 등록 실패 (${res.status})`);
      }
      localStorage.setItem(LS_NAME_KEY, commentForm.author_name.trim());
      localStorage.setItem(LS_PW_KEY, commentForm.author_password.trim());
      setCommentForm({ ...commentForm, content: '' });
      await fetchComments(selectedPost.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    }
  };

  const renderList = () => (
    <div className="w-full">
      <div
        className="px-4 pt-4 pb-3 border-b border-violet-200 mb-4 flex items-center justify-between gap-2 rounded-xl"
        style={{ background: '#F5F3FF' }}
      >
        <h1 className="text-sm font-normal text-gray-900">WAV 자유게시판 ✏️</h1>
        <button
          onClick={() => setView('write')}
          className="text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-full transition-colors border border-violet-200"
        >
          글쓰기
        </button>
      </div>

      <div className="pb-3">
        {loading ? (
          <div className="py-10 text-center text-gray-400">불러오는 중입니다...</div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="text-4xl mb-3">✨</div>
            <p className="text-sm">아직 글이 없어요</p>
            <p className="text-xs mt-1">첫 번째 글을 남겨보세요!</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden" style={cardShadow}>
            <div className="flex items-center px-3 py-2 text-[11px] text-gray-400 border-b border-violet-100">
              <span className="w-8 shrink-0 text-center">#</span>
              <span className="flex-1 min-w-0">제목</span>
              <span className="w-16 shrink-0 text-center">작성자</span>
              <span className="w-14 shrink-0 text-center">날짜</span>
              <span className="w-10 shrink-0 text-center">조회</span>
              <span className="w-8 shrink-0 text-center">댓글</span>
            </div>
            {posts.map((post, idx) => (
              <button
                type="button"
                key={post.id}
                onClick={() => openDetail(post)}
                className="w-full flex items-center px-3 py-3.5 text-left border-b border-violet-50 hover:bg-violet-50 transition-colors"
              >
                <span className="w-8 shrink-0 text-center text-[11px] text-gray-400">{posts.length - idx}</span>
                <span className="flex-1 min-w-0 text-[14px] text-gray-800 truncate pr-2">{post.title}</span>
                <span className="w-16 shrink-0 text-center text-[11px] text-violet-600 truncate">{post.author_name}</span>
                <span className="w-14 shrink-0 text-center text-[11px] text-gray-400">{timeAgo(post.created_at)}</span>
                <span className="w-10 shrink-0 text-center text-[11px] text-gray-400">{post.views || 0}</span>
                <span className="w-8 shrink-0 text-center text-[11px] text-gray-400">{post.comments_count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedPost) {
      return (
        <div className="w-full">
          <div className="flex items-center px-4 pt-4 pb-2">
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-600 transition-colors"
              onClick={() => setView('list')}
            >
              <span className="text-base">←</span>
              <span>목록</span>
            </button>
          </div>
          <div className="rounded-xl bg-white p-6 text-center text-gray-400">게시글을 선택하지 않았습니다.</div>
        </div>
      );
    }

    return (
      <div className="w-full">
        <div className="flex items-center px-4 pt-4 pb-2">
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-600 transition-colors"
            onClick={() => setView('list')}
          >
            <span className="text-base">←</span>
            <span>목록</span>
          </button>
        </div>

        <div className='mx-4 mt-2 mb-4 bg-white rounded-2xl overflow-hidden' style={cardShadow}>
          <div className="px-4 pt-4 pb-4">
            <h2 className="text-lg font-bold text-gray-900 mb-1.5">{selectedPost.title}</h2>
            <div className="text-xs text-gray-400 mb-4">
              <span className="font-medium text-violet-600">{selectedPost.author_name}</span>
              <span> · </span>
              <span>
                {new Date(selectedPost.created_at).toLocaleString('ko-KR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className="border-t border-violet-100 mb-4" />
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedPost.content}</div>
          </div>

          <div className="px-4 py-3 border-t border-violet-100">
            <div
              className={
                comments.length === 0
                  ? 'text-[11px] text-gray-400 font-normal'
                  : 'text-sm font-semibold text-gray-600'
              }
            >
              댓글 {comments.length}개
            </div>
          </div>

          <div>
            {comments.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">첫 댓글을 남겨보세요 💬</div>
            ) : (
              comments.map(comment => (
                <div
                  key={comment.id}
                  className="px-4 py-3 border-b border-violet-50 last:border-none flex gap-2"
                >
                  {comment.is_member_comment && comment.member_id ? (
                    <img
                      src={`/idols/${comment.member_id}/profile.jpg`}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                      alt={comment.author_name}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {comment.author_name[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className={`text-xs font-semibold ${comment.is_member_comment && comment.member_id ? 'text-violet-600 font-semibold' : 'text-gray-700'}`}>
                        {comment.author_name}
                      </span>
                      <span className="ml-2 text-[10px] text-gray-400">{timeAgo(comment.created_at)}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">{comment.content}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-violet-100 mt-2 pt-4 px-4 pb-6 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block px-1 mb-1.5 text-xs font-semibold text-violet-600">아이디</label>
              <input
                type="text"
                value={commentForm.author_name}
                onChange={e => setCommentForm({ ...commentForm, author_name: e.target.value })}
                className="w-full bg-white rounded-xl px-3 py-2.5 text-sm border border-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div className="flex-1">
              <label className="block px-1 mb-1.5 text-xs font-semibold text-violet-600">비밀번호</label>
              <input
                type="password"
                value={commentForm.author_password}
                onChange={e => setCommentForm({ ...commentForm, author_password: e.target.value })}
                className="w-full bg-white rounded-xl px-3 py-2.5 text-sm border border-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>
          <div>
            <label className="block px-1 mb-1.5 text-xs font-semibold text-violet-600">댓글 내용</label>
            <textarea
              rows={3}
              value={commentForm.content}
              onChange={e => setCommentForm({ ...commentForm, content: e.target.value })}
              className="w-full bg-white rounded-xl px-3 py-2.5 text-sm border border-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-200 resize-none"
            />
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={submitComment}
              className="text-xs font-semibold bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded-full transition-colors"
            >
              등록
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderWrite = () => (
    <div className="w-full space-y-4">
      {/* 상단 헤더 */}
      <div className="relative flex items-center px-4 pt-4 pb-3">
        <button
          onClick={() => setView('list')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-violet-600 transition-colors"
        >
          <span>←</span>
          <span>취소</span>
        </button>
        <span className="absolute left-0 right-0 text-center text-sm font-semibold text-violet-700 pointer-events-none">글쓰기</span>
      </div>

      <div className="px-4">
        <div className="mb-3">
          <label className="mb-1.5 block px-1 text-xs font-semibold text-violet-600">아이디</label>
          <input
            type="text"
            placeholder="코스모스_별빛123"
            value={writeForm.author_name}
            onChange={e => setWriteForm({ ...writeForm, author_name: e.target.value })}
            autoComplete="off"
            style={{ WebkitBoxShadow: '0 0 0 100px white inset', WebkitTextFillColor: '#1f2937' }}
            className="w-full rounded-2xl border-0 bg-white px-4 py-3.5 text-sm text-gray-800 shadow-[0_2px_12px_rgba(109,40,217,0.08)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div className="mb-3">
          <div className="mb-1.5 flex items-center gap-2 px-1">
            <span className="text-xs font-semibold text-violet-600">비밀번호</span>
            <span className="text-[10px] text-gray-400">수정·삭제 시 필요</span>
          </div>
          <input
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={writeForm.author_password}
            onChange={e => setWriteForm({ ...writeForm, author_password: e.target.value })}
            autoComplete="new-password"
            style={{ WebkitBoxShadow: '0 0 0 100px white inset', WebkitTextFillColor: '#1f2937' }}
            className="w-full rounded-2xl border-0 bg-white px-4 py-3.5 text-sm text-gray-800 shadow-[0_2px_12px_rgba(109,40,217,0.08)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div className="mb-3">
          <label className="mb-1.5 block px-1 text-xs font-semibold text-violet-600">제목</label>
          <input
            type="text"
            placeholder=""
            value={writeForm.title}
            onChange={e => setWriteForm({ ...writeForm, title: e.target.value })}
            className="w-full rounded-2xl border-0 bg-white px-4 py-3.5 text-sm text-gray-800 shadow-[0_2px_12px_rgba(109,40,217,0.08)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div className="mb-3">
          <label className="mb-1.5 block px-1 text-xs font-semibold text-violet-600">내용</label>
          <textarea
            rows={8}
            placeholder=""
            value={writeForm.content}
            onChange={e => setWriteForm({ ...writeForm, content: e.target.value })}
            className="min-h-[220px] w-full resize-none rounded-2xl border-0 bg-white px-4 py-3.5 text-sm text-gray-800 placeholder-gray-400 shadow-[0_2px_12px_rgba(109,40,217,0.08)] focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div className="flex justify-end mt-2">
          <button onClick={submitPost} className="bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm transition-colors">
            등록
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-4">
      {view === 'list' && renderList()}
      {view === 'detail' && renderDetail()}
      {view === 'write' && renderWrite()}
    </div>
  );
};

export default PulsePage;
