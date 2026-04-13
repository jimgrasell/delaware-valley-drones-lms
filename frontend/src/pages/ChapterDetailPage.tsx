import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { chaptersApi, type Chapter } from '../api/chapters';
import { useAuthStore } from '../store/auth';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; chapter: Chapter };

function ChapterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState({ kind: 'loading' });

    chaptersApi
      .getById(id)
      .then((chapter) => {
        if (cancelled) return;
        setState({ kind: 'success', chapter });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        let message = 'Failed to load chapter.';
        if (err && typeof err === 'object') {
          const e = err as {
            response?: { data?: { message?: string; error?: string } };
            message?: string;
          };
          message =
            e.response?.data?.message ||
            e.response?.data?.error ||
            e.message ||
            message;
        }
        setState({ kind: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleMarkComplete = async () => {
    if (!id) return;
    setMarking(true);
    setMarkError(null);
    try {
      await chaptersApi.markCompleted(id);
      // Re-fetch to pick up the updated progress so the UI reflects the new status.
      const refreshed = await chaptersApi.getById(id);
      setState({ kind: 'success', chapter: refreshed });
    } catch (err: unknown) {
      let message = 'Could not mark chapter complete.';
      if (err && typeof err === 'object') {
        const e = err as {
          response?: { data?: { message?: string; error?: string } };
          message?: string;
        };
        message =
          e.response?.data?.message ||
          e.response?.data?.error ||
          e.message ||
          message;
      }
      setMarkError(message);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link
          to="/"
          className="text-sm text-slate-500 hover:text-brand"
        >
          &larr; All chapters
        </Link>
      </div>

      {state.kind === 'loading' && (
        <div className="rounded border border-slate-200 bg-white p-6 text-slate-500">
          Loading chapter&hellip;
        </div>
      )}

      {state.kind === 'error' && (
        <div className="rounded border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-900">Could not load chapter.</p>
          <p className="mt-1 text-sm text-red-700">{state.message}</p>
        </div>
      )}

      {state.kind === 'success' && (
        <ChapterContent
          chapter={state.chapter}
          isAuthenticated={isAuthenticated}
          onMarkComplete={handleMarkComplete}
          marking={marking}
          markError={markError}
        />
      )}
    </div>
  );
}

interface ChapterContentProps {
  chapter: Chapter;
  isAuthenticated: boolean;
  onMarkComplete: () => void;
  marking: boolean;
  markError: string | null;
}

function ChapterContent({
  chapter,
  isAuthenticated,
  onMarkComplete,
  marking,
  markError,
}: ChapterContentProps) {
  const completed = chapter.progress?.status === 'completed';

  return (
    <>
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-brand text-base font-semibold text-white">
          {chapter.chapterNumber}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Chapter {chapter.chapterNumber}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            {chapter.title}
          </h1>
          <p className="mt-2 text-slate-600">{chapter.description}</p>
        </div>
      </div>

      {/* Video lecture */}
      {chapter.videoVimeoId && (
        <div className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-black shadow-sm">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={`https://player.vimeo.com/video/${chapter.videoVimeoId}?badge=0&autopause=0&player_id=0`}
              className="absolute inset-0 h-full w-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={`Chapter ${chapter.chapterNumber} video lecture`}
            />
          </div>
        </div>
      )}

      {/* Chapter body content */}
      <article
        className="prose prose-slate max-w-none rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        dangerouslySetInnerHTML={{
          __html:
            chapter.content ||
            '<p>Chapter content coming soon. Check back for video lessons and study materials.</p>',
        }}
      />

      {/* Action bar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {isAuthenticated && !completed && (
          <button
            type="button"
            onClick={onMarkComplete}
            disabled={marking}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {marking ? 'Marking…' : 'Mark complete'}
          </button>
        )}

        {isAuthenticated && completed && (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            ✓ Completed
          </span>
        )}

        {isAuthenticated && chapter.quizCount > 0 ? (
          <Link
            to={`/chapters/${chapter.id}/quiz`}
            className="rounded-md border border-brand bg-white px-4 py-2 text-sm font-medium text-brand shadow-sm transition hover:bg-brand hover:text-white"
          >
            Take quiz ({chapter.quizCount})
          </Link>
        ) : chapter.quizCount > 0 ? (
          <span className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-400">
            Take quiz ({chapter.quizCount})
          </span>
        ) : null}

        {!isAuthenticated && (
          <Link
            to="/login"
            className="text-sm text-brand hover:underline"
          >
            Sign in to track your progress
          </Link>
        )}
      </div>

      {markError && (
        <p className="mt-3 text-sm text-red-700">{markError}</p>
      )}
    </>
  );
}

export default ChapterDetailPage;
