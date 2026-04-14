import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import {
  studentsApi,
  type ProgressData,
  type ChapterProgress,
  type ProgressStatus,
} from '../api/students';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; data: ProgressData };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ProgressStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

const STATUS_STYLES: Record<ProgressStatus, string> = {
  not_started: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
};

function StatusPill({ status }: { status: ProgressStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// Find the first chapter that isn't completed — used as the "Continue
// where you left off" target. Falls back to chapter 1 if everything is
// completed (the user can still revisit).
function findNextChapter(chapters: ChapterProgress[]): ChapterProgress | null {
  if (chapters.length === 0) return null;
  const sorted = [...chapters].sort(
    (a, b) => a.chapterNumber - b.chapterNumber
  );
  return sorted.find((c) => c.status !== 'completed') || sorted[0];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    studentsApi
      .getProgress()
      .then((data) => {
        if (cancelled) return;
        setState({ kind: 'success', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        let message = 'Failed to load your progress.';
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
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Greeting */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-900">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}.
        </h2>
        <p className="mt-1 text-slate-600">
          Here's where you stand in your Part 107 course.
        </p>
      </div>

      {state.kind === 'loading' && (
        <div className="rounded border border-slate-200 bg-white p-6 text-slate-500">
          Loading your progress&hellip;
        </div>
      )}

      {state.kind === 'error' && (
        <div className="rounded border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-900">
            Could not load your progress.
          </p>
          <p className="mt-1 text-sm text-red-700">{state.message}</p>
        </div>
      )}

      {state.kind === 'success' && (
        <DashboardContent data={state.data} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loaded content
// ---------------------------------------------------------------------------

function DashboardContent({ data }: { data: ProgressData }) {
  const { totalChapters, completedChapters, overallProgress, chapters } = data;
  const nextChapter = findNextChapter(chapters);
  const everythingDone =
    totalChapters > 0 && completedChapters === totalChapters;

  return (
    <>
      {/* Top stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Chapters Complete"
          value={`${completedChapters} / ${totalChapters}`}
        />
        <StatCard label="Overall Progress" value={`${overallProgress}%`} />
        <StatCard
          label="Status"
          value={everythingDone ? 'Course complete' : 'In progress'}
        />
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Course progress
          </span>
          <span className="text-xs font-medium text-slate-600">
            {overallProgress}%
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: `${overallProgress}%` }}
            aria-label={`${overallProgress}% complete`}
          />
        </div>
      </div>

      {/* Certificate CTA — show when course is complete */}
      {everythingDone && (
        <div className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-lg font-semibold text-emerald-800">
            Congratulations! You've completed the course.
          </p>
          <Link
            to="/certificate"
            className="mt-3 inline-block rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow transition hover:bg-emerald-700"
          >
            View your certificate
          </Link>
        </div>
      )}

      {/* Continue CTA */}
      {nextChapter && (
        <div className="mb-8 rounded-lg border border-brand/20 bg-brand/5 p-5">
          <p className="text-xs font-medium text-brand uppercase tracking-wide">
            {everythingDone ? 'Revisit' : 'Continue where you left off'}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            Chapter {nextChapter.chapterNumber}: {nextChapter.title}
          </h3>
          <Link
            to={`/chapters/${nextChapter.chapterId}`}
            className="mt-3 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-brand-light"
          >
            {nextChapter.status === 'not_started' ? 'Start chapter' : 'Resume chapter'}
          </Link>
        </div>
      )}

      {/* Per-chapter list */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          All chapters
        </h3>
        <ul className="space-y-2">
          {[...chapters]
            .sort((a, b) => a.chapterNumber - b.chapterNumber)
            .map((chapter) => (
              <li
                key={chapter.chapterId}
                className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand"
              >
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                  {chapter.chapterNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {chapter.title}
                  </p>
                  {chapter.bestQuizScore > 0 && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Best quiz score: {chapter.bestQuizScore}%
                    </p>
                  )}
                </div>
                <StatusPill status={chapter.status} />
              </li>
            ))}
        </ul>
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default DashboardPage;
