import { useEffect, useState } from 'react';
import { chaptersApi, type Chapter } from '../api/client';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; chapters: Chapter[]; total: number };

function ChaptersPage() {
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
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-900">Course Chapters</h2>
        <p className="mt-1 text-slate-600">
          Master FAA Part 107 with 13 chapters covering airspace, weather,
          regulations, safety, and emergency procedures.
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
          <p className="mt-3 text-xs text-red-600">
            Check that the backend is reachable and that{' '}
            <code className="rounded bg-red-100 px-1 py-0.5">VITE_API_URL</code>{' '}
            is configured correctly.
          </p>
        </div>
      )}

      {state.kind === 'success' && (
        <>
          <p className="mb-4 text-sm text-slate-500">
            Showing {state.total} chapter{state.total === 1 ? '' : 's'}.
          </p>
          <ul className="space-y-3">
            {state.chapters.map((chapter) => (
              <li
                key={chapter.id}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand hover:shadow"
              >
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
                      {chapter.isPublished ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                          Draft
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default ChaptersPage;
