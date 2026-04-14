import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { forumApi, type ForumPost, type ForumReply } from '../api/forum';
import { useAuthStore } from '../store/auth';

function extractErr(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message || e.message || 'Something went wrong';
  }
  return 'Something went wrong';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; post: ForumPost };

function ForumPostPage() {
  const { id } = useParams<{ id: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const loadPost = () => {
    if (!id) return;
    setState({ kind: 'loading' });
    forumApi
      .getPost(id)
      .then((post) => setState({ kind: 'success', post }))
      .catch((err) => setState({ kind: 'error', message: extractErr(err) }));
  };

  useEffect(() => { loadPost(); }, [id]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link to="/forum" className="text-sm text-slate-500 hover:text-brand">
          &larr; Back to forum
        </Link>
      </div>

      {state.kind === 'loading' && (
        <div className="rounded border border-slate-200 bg-white p-6 text-slate-500">Loading&hellip;</div>
      )}

      {state.kind === 'error' && (
        <div className="rounded border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-900">Could not load post.</p>
          <p className="mt-1 text-sm text-red-700">{state.message}</p>
        </div>
      )}

      {state.kind === 'success' && (
        <PostContent
          post={state.post}
          isAuthenticated={isAuthenticated}
          onReplyAdded={loadPost}
        />
      )}
    </div>
  );
}

function PostContent({
  post,
  isAuthenticated,
  onReplyAdded,
}: {
  post: ForumPost;
  isAuthenticated: boolean;
  onReplyAdded: () => void;
}) {
  const replies = post.replies || [];

  return (
    <>
      {/* Post */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          {post.isPinned && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Pinned
            </span>
          )}
          {post.isClosed && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              Closed
            </span>
          )}
        </div>

        <h1 className="text-xl font-semibold text-slate-900">{post.title}</h1>

        <p className="mt-1 text-xs text-slate-500">
          {post.author.firstName} {post.author.lastName}
          <span className="capitalize text-slate-400 ml-1">({post.author.role})</span>
          <span className="mx-1">&middot;</span>
          {formatDate(post.createdAt)}
        </p>

        <div className="mt-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
          {post.content}
        </div>
      </div>

      {/* Replies */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
          {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
        </h2>

        {replies.length === 0 ? (
          <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-500 text-center">
            No replies yet.
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((reply) => (
              <ReplyCard key={reply.id} reply={reply} />
            ))}
          </div>
        )}
      </div>

      {/* Reply form */}
      {isAuthenticated && !post.isClosed && (
        <ReplyForm postId={post.id} onReplyAdded={onReplyAdded} />
      )}

      {post.isClosed && (
        <p className="mt-4 text-center text-sm text-slate-400">
          This thread is closed. No new replies.
        </p>
      )}

      {!isAuthenticated && !post.isClosed && (
        <div className="mt-4 text-center text-sm text-slate-500">
          <Link to="/login" className="text-brand hover:underline">Sign in</Link> to reply.
        </div>
      )}
    </>
  );
}

function ReplyCard({ reply }: { reply: ForumReply }) {
  return (
    <div
      className={`rounded-lg border p-4 shadow-sm ${
        reply.isMarkedAsAnswer
          ? 'border-emerald-200 bg-emerald-50/30'
          : 'border-slate-200 bg-white'
      }`}
    >
      {reply.isMarkedAsAnswer && (
        <span className="text-xs font-medium text-emerald-600 mb-1 block">Accepted Answer</span>
      )}
      <div className="text-sm text-slate-700 whitespace-pre-wrap">{reply.content}</div>
      <p className="mt-2 text-xs text-slate-500">
        {reply.author.firstName} {reply.author.lastName}
        <span className="capitalize text-slate-400 ml-1">({reply.author.role})</span>
        <span className="mx-1">&middot;</span>
        {formatDate(reply.createdAt)}
      </p>
    </div>
  );
}

function ReplyForm({
  postId,
  onReplyAdded,
}: {
  postId: string;
  onReplyAdded: () => void;
}) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 10) return;
    setSaving(true);
    setError(null);

    try {
      await forumApi.createReply(postId, content.trim());
      setContent('');
      onReplyAdded();
    } catch (err) {
      setError(extractErr(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-2">Add a reply</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your reply (min 10 characters)..."
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving || content.trim().length < 10}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-brand-light disabled:opacity-50"
        >
          {saving ? 'Posting…' : 'Reply'}
        </button>
      </form>
    </div>
  );
}

export default ForumPostPage;
