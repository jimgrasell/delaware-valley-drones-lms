import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { chaptersApi, type Chapter } from '../api/chapters';
import { useAuthStore } from '../store/auth';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; chapters: Chapter[]; total: number };

function ChaptersPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    chaptersApi
      .list()
      .then((res) => {
        if (cancelled) return;
        setState({
          kind: 'success',
          chapters: res.data.chapters,
          total: res.data.total,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load chapters';
        setState({ kind: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      {/* Hero section — only for unauthenticated visitors */}
      {!isAuthenticated && (
        <div className="bg-brand text-white">
          <div className="max-w-5xl mx-auto px-6 py-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Pass Your FAA Part 107 Exam
            </h1>
            <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
              The complete remote pilot certification course. 13 chapters of expert
              instruction, video lectures, and 142 practice questions to get you
              certified on your first attempt.
            </p>
            <p className="mt-6 text-3xl font-bold text-white">$99</p>
            <p className="text-sm text-white/70">one-time payment, lifetime access</p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-brand shadow transition hover:bg-white/90"
              >
                Get started
              </Link>
              <Link
                to="/login"
                className="rounded-md border border-white/30 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-8 text-sm text-white/70">
              <div>
                <span className="block text-2xl font-bold text-white">13</span>
                chapters
              </div>
              <div>
                <span className="block text-2xl font-bold text-white">142</span>
                practice questions
              </div>
              <div>
                <span className="block text-2xl font-bold text-white">70%</span>
                passing score
              </div>
              <div>
                <span className="block text-2xl font-bold text-white">100%</span>
                online
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chapter catalog */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-900">
            {isAuthenticated ? 'Course Chapters' : 'What You\'ll Learn'}
          </h2>
          <p className="mt-1 text-slate-600">
            {isAuthenticated
              ? 'Master FAA Part 107 with 13 chapters covering airspace, weather, regulations, safety, and emergency procedures.'
              : '13 comprehensive chapters covering everything you need to pass the FAA Part 107 knowledge exam.'}
          </p>
        </div>

        {state.kind === 'loading' && (
          <div className="rounded border border-slate-200 bg-white p-6 text-slate-500">
            Loading chapters&hellip;
          </div>
        )}

        {state.kind === 'error' && (
          <div className="rounded border border-red-200 bg-red-50 p-6">
            <p className="font-medium text-red-900">Could not load chapters.</p>
            <p className="mt-1 text-sm text-red-700">{state.message}</p>
          </div>
        )}

        {state.kind === 'success' && (
          <>
            <ul className="space-y-3">
              {state.chapters.map((chapter) => (
                <li key={chapter.id}>
                  {isAuthenticated ? (
                    <Link
                      to={`/chapters/${chapter.id}`}
                      className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand hover:shadow focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <ChapterCardContent chapter={chapter} />
                    </Link>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <ChapterCardContent chapter={chapter} />
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* Bottom CTA for unauthenticated */}
            {!isAuthenticated && (
              <div className="mt-10 rounded-lg border border-brand/20 bg-brand/5 p-8 text-center">
                <h3 className="text-xl font-semibold text-slate-900">
                  Ready to get certified?
                </h3>
                <p className="mt-2 text-slate-600">
                  Enroll today for $99 and start your journey to becoming an FAA-certified remote pilot.
                </p>
                <Link
                  to="/register"
                  className="mt-4 inline-block rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-light"
                >
                  Enroll for $99
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ChapterCardContent({ chapter }: { chapter: Chapter }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
        {chapter.chapterNumber}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-slate-900">
          {chapter.title}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          {chapter.description}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span>
            {chapter.quizCount} quiz
            {chapter.quizCount === 1 ? '' : 'zes'}
          </span>
          {chapter.isPublished && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
              Published
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChaptersPage;
