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
  'AG_ファイター',
  'ミジュコプター愛好家',
  'SUZUKA推し',
  'RIN_ヒップホップ',
  'KANON_クラシック',
  '奈子の応援団',
  '奈々さん大好き',
  '太陽くんファン',
  'よしあき_ファッション',
  'ミチのIt_GIRL',
  'TWIN_PLANET_love',
  'AG_セーラー服',
  'オトナブルー中毒',
  '首振りダンス練習中',
  'TWIN_PLANET_global',
];
const CUTE_PASSWORDS = [
  'star123',
  'heart999',
  'limegreen777',
  'cosmos♡',
  'stream456',
  'otaku888',
  'TWINPLANET💚',
  'fanpower321',
  'cheering555',
  'oshi_love999',
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
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    return localStorage.getItem(LS_NAME_KEY) || IDOL_NICKNAMES[Math.floor(Math.random() * IDOL_NICKNAMES.length)] || 'TWIN_PLANET_love';
  }, []);
  const defaultPassword = useMemo(() => {
    return localStorage.getItem(LS_PW_KEY) || CUTE_PASSWORDS[Math.floor(Math.random() * CUTE_PASSWORDS.length)] || 'star123';
  }, []);

  const [view, setView] = useState<View>('list');
  const [posts, setPosts] = useState<PulsePost[]>([]);
  const [selectedPost, setSelectedPost] = useState<PulsePost | null>(null);
  const [comments, setComments] = useState<PulseComment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [writeForm, setWriteForm] = useState<WriteFormState>(() => {
    const initialNickname = defaultNickname || 'TWIN_PLANET_love';
    const initialPassword = defaultPassword || 'star123';

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
        throw new Error(`Failed to load posts (${res.status})`);
      }
      const data = (await res.json()) as PulsePost[];
      setPosts(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An unknown error occurred.');
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
        throw new Error(`Failed to load comments (${res.status})`);
      }
      const data = (await res.json()) as PulseComment[];
      setComments(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An unknown error occurred.');
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
      alert('Nickname, title, and content are required.');
      return;
    }
    if (isConfigMissing()) {
      alert('Supabase environment variables are not configured.');
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
        throw new Error(`Failed to submit post (${res.status})`);
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
      alert(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  };

  const submitComment = async () => {
    if (!selectedPost) return;
    if (!commentForm.author_name.trim() || !commentForm.content.trim()) {
      alert('Nickname and content are required.');
      return;
    }
    if (isConfigMissing()) {
      alert('Supabase environment variables are not configured.');
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
        throw new Error(`Failed to submit comment (${res.status})`);
      }
      localStorage.setItem(LS_NAME_KEY, commentForm.author_name.trim());
      localStorage.setItem(LS_PW_KEY, commentForm.author_password.trim());
      setCommentForm({ ...commentForm, content: '' });
      await fetchComments(selectedPost.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  };

  const renderList = () => (
    <div className="w-full">
      <div
        className="px-4 pt-4 pb-3 border-b border-violet-200 mb-4 flex items-center justify-between gap-2 rounded-xl"
        style={{ background: '#F5F3FF' }}
      >
        <h1 className="text-sm font-normal text-gray-900">TWIN PLANET 자유게시판 ✏️</h1>
        <button
          onClick={() => setView('write')}
          className="text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-full transition-colors border border-violet-200"
        >
          Write
        </button>
      </div>

      <div className="pb-3">
        {loading ? (
          <div className="py-10 text-center text-gray-400">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="text-4xl mb-3">✨</div>
            <p className="text-sm">No posts yet</p>
            <p className="text-xs mt-1">Be the first to write!</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden" style={cardShadow}>
            <div className="flex items-center px-3 py-2 text-[11px] text-gray-400 border-b border-violet-100">
              <span className="w-8 shrink-0 text-center">#</span>
              <span className="flex-1 min-w-0">Title</span>
              <span className="w-16 shrink-0 text-center">Author</span>
              <span className="w-14 shrink-0 text-center">Date</span>
              <span className="w-10 shrink-0 text-center">Views</span>
              <span className="w-8 shrink-0 text-center">Comments</span>
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
              <span>List</span>
            </button>
          </div>
          <div className="rounded-xl bg-white p-6 text-center text-gray-400">No post selected.</div>
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
            <span>List</span>
          </button>
        </div>

        <div className='mx-4 mt-2 mb-4 bg-white rounded-2xl overflow-hidden' style={cardShadow}>
          <div className="px-4 pt-4 pb-4">
            <h2 className="text-lg font-bold text-gray-900 mb-1.5">{selectedPost.title}</h2>
            <div className="text-xs text-gray-400 mb-4">
              <span className="font-medium text-violet-600">{selectedPost.author_name}</span>
              <span> · </span>
              <span>
                {new Date(selectedPost.created_at).toLocaleString('en-US', {
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
              Comments {comments.length}
            </div>
          </div>

          <div>
            {comments.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">Be the first to comment 💬</div>
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
              <label className="block px-1 mb-1.5 text-xs font-semibold text-violet-600">ニックネーム</label>
              <input
                type="text"
                value={commentForm.author_name}
                onChange={e => setCommentForm({ ...commentForm, author_name: e.target.value })}
                className="w-full bg-white rounded-xl px-3 py-2.5 text-sm border border-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div className="flex-1">
              <label className="block px-1 mb-1.5 text-xs font-semibold text-violet-600">Password</label>
              <input
                type="password"
                value={commentForm.author_password}
                onChange={e => setCommentForm({ ...commentForm, author_password: e.target.value })}
                className="w-full bg-white rounded-xl px-3 py-2.5 text-sm border border-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>
          <div>
            <label className="block px-1 mb-1.5 text-xs font-semibold text-violet-600">内容を入力してください</label>
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
              Submit
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
          <span>Cancel</span>
        </button>
        <span className="absolute left-0 right-0 text-center text-sm font-semibold text-violet-700 pointer-events-none">Write</span>
      </div>

      <div className="px-4">
        <div className="mb-3">
          <label className="mb-1.5 block px-1 text-xs font-semibold text-violet-600">ニックネーム</label>
          <input
            type="text"
            placeholder="TWIN_PLANET_love"
            value={writeForm.author_name}
            onChange={e => setWriteForm({ ...writeForm, author_name: e.target.value })}
            autoComplete="off"
            style={{ WebkitBoxShadow: '0 0 0 100px white inset', WebkitTextFillColor: '#1f2937' }}
            className="w-full rounded-2xl border-0 bg-white px-4 py-3.5 text-sm text-gray-800 shadow-[0_2px_12px_rgba(109,40,217,0.08)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div className="mb-3">
          <div className="mb-1.5 flex items-center gap-2 px-1">
            <span className="text-xs font-semibold text-violet-600">Password</span>
            <span className="text-[10px] text-gray-400">Required for edit/delete</span>
          </div>
          <input
            type="password"
            placeholder="Enter password"
            value={writeForm.author_password}
            onChange={e => setWriteForm({ ...writeForm, author_password: e.target.value })}
            autoComplete="new-password"
            style={{ WebkitBoxShadow: '0 0 0 100px white inset', WebkitTextFillColor: '#1f2937' }}
            className="w-full rounded-2xl border-0 bg-white px-4 py-3.5 text-sm text-gray-800 shadow-[0_2px_12px_rgba(109,40,217,0.08)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div className="mb-3">
          <label className="mb-1.5 block px-1 text-xs font-semibold text-violet-600">Title</label>
          <input
            type="text"
            placeholder=""
            value={writeForm.title}
            onChange={e => setWriteForm({ ...writeForm, title: e.target.value })}
            className="w-full rounded-2xl border-0 bg-white px-4 py-3.5 text-sm text-gray-800 shadow-[0_2px_12px_rgba(109,40,217,0.08)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div className="mb-3">
          <label className="mb-1.5 block px-1 text-xs font-semibold text-violet-600">Content</label>
          <textarea
            rows={8}
            placeholder="TWIN PLANETタレントについて自由に話そう！"
            value={writeForm.content}
            onChange={e => setWriteForm({ ...writeForm, content: e.target.value })}
            className="min-h-[220px] w-full resize-none rounded-2xl border-0 bg-white px-4 py-3.5 text-sm text-gray-800 placeholder-gray-400 shadow-[0_2px_12px_rgba(109,40,217,0.08)] focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div className="flex justify-end mt-2">
          <button onClick={submitPost} className="bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm transition-colors">
            Submit
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
