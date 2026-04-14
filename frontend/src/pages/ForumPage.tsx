import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forumApi, type ForumPost, type ForumPagination } from '../api/forum';
import { useAuthStore } from '../store/auth';

function extractErr(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message || e.message || 'Something went wrong';
  }
  return 'Something went wrong';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; posts: ForumPost[]; pagination: ForumPagination };

function ForumPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [page, setPage] = useState(1);
  const [showNewPost, setShowNewPost] = useState(false);

  const loadPosts = useCallback((p: number) => {
    setState({ kind: 'loading' });
    forumApi
      .getPosts(p, 20, 'newest')
      .then((data) => {
        setState({ kind: 'success', posts: data.posts, pagination: data.pagination });
        setPage(p);
      })
      .catch((err) => setState({ kind: 'error', message: extractErr(err) }));
  }, []);

  useEffect(() => { loadPosts(1); }, [loadPosts]);

  const handlePostCreated = () => {
    setShowNewPost(false);
    loadPosts(1);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Community Forum</h1>
          <p className="mt-1 text-slate-600">
            Ask questions, share tips, and connect with fellow students.
          </p>
        </div>
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setShowNewPost(!showNewPost)}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-brand-light"
          >
            {showNewPost ? 'Cancel' : 'New post'}
          </button>
        )}
      </div>

      {showNewPost && <NewPostForm onCreated={handlePostCreated} />}

      {state.kind === 'loading' && (
        <div className="rounded border border-slate-200 bg-white p-6 text-slate-500">Loading posts&hellip;</div>
      )}

      {state.kind === 'error' && (
        <div className="rounded border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-900">Could not load forum posts.</p>
          <p className="mt-1 text-sm text-red-700">{state.message}</p>
        </div>
      )}

      {state.kind === 'success' && (
        <>
          {state.posts.length === 0 ? (
            <div className="rounded border border-slate-200 bg-white p-8 text-center text-slate-500">
              No posts yet. Be the first to start a discussion!
            </div>
          ) : (
            <div className="space-y-2">
              {/* Pinned posts first, then the rest */}
              {[...state.posts]
                .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                .map((post) => (
                  <Link
                    key={post.id}
                    to={`/forum/${post.id}`}
                    className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand hover:shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {post.isPinned && (
                            <span className="text-xs font-medium text-amber-600">Pinned</span>
                          )}
                          {post.isClosed && (
                            <span className="text-xs font-medium text-slate-400">Closed</span>
                          )}
                          <h3 className="text-sm font-semibold text-slate-900 truncate">
                            {post.title}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {post.author.firstName} {post.author.lastName}
                          <span className="mx-1">&middot;</span>
                          {timeAgo(post.createdAt)}
                          <span className="mx-1">&middot;</span>
                          {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          )}

          {state.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>Page {state.pagination.page} of {state.pagination.pages}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => loadPosts(page - 1)}
                  className="rounded border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= state.pagination.pages}
                  onClick={() => loadPosts(page + 1)}
                  className="rounded border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {!isAuthenticated && (
        <div className="mt-6 text-center text-sm text-slate-500">
          <Link to="/login" className="text-brand hover:underline">Sign in</Link> to create posts and reply.
        </div>
      )}
    </div>
  );
}

function NewPostForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);

    try {
      await forumApi.createPost(title.trim(), content.trim());
      onCreated();
    } catch (err) {
      setError(extractErr(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">New post</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind? (min 10 characters)"
          rows={4}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={saving || !title.trim() || content.trim().length < 10}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-brand-light disabled:opacity-50"
        >
          {saving ? 'Posting…' : 'Post'}
        </button>
      </form>
    </div>
  );
}

export default ForumPage;
