import { useEffect, useState } from 'react';
import { adminApi, type Analytics } from '../../api/admin';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; data: Analytics };

function DashboardTab() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    adminApi
      .getAnalytics()
      .then((data) => {
        if (!cancelled) setState({ kind: 'success', data });
      })
      .catch((err) => {
        if (!cancelled) setState({ kind: 'error', message: extractErr(err) });
      });
    return () => { cancelled = true; };
  }, []);

  if (state.kind === 'loading') return <Loading />;
  if (state.kind === 'error') return <Error message={state.message} />;

  const { overview, quizStatistics, chapterEngagement } = state.data;

  return (
    <div className="space-y-8">
      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Students" value={overview.totalStudents} />
        <StatCard label="Enrolled" value={overview.enrolledStudents} />
        <StatCard label="Completed" value={overview.completedStudents} />
        <StatCard label="Completion Rate" value={`${overview.completionRate}%`} />
        <StatCard label="Quiz Attempts" value={quizStatistics.totalAttempts} />
        <StatCard label="Avg Score" value={`${Math.round(quizStatistics.averageScore)}%`} />
      </div>

      {/* Quiz stats */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Quiz Performance
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Passed" value={quizStatistics.passedAttempts} />
          <StatCard
            label="Failed"
            value={quizStatistics.totalAttempts - quizStatistics.passedAttempts}
          />
          <StatCard label="Failure Rate" value={`${Math.round(quizStatistics.failureRate)}%`} />
          <StatCard label="Avg Score" value={`${Math.round(quizStatistics.averageScore)}%`} />
        </div>
      </div>

      {/* Chapter engagement table */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Chapter Engagement
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-600">#</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Chapter</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Students Reached</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Quizzes</th>
              </tr>
            </thead>
            <tbody>
              {[...chapterEngagement]
                .sort((a, b) => a.chapterNumber - b.chapterNumber)
                .map((ch) => (
                  <tr key={ch.chapterId} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-500">{ch.chapterNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{ch.title}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{ch.studentProgress}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{ch.quizCount}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Loading() {
  return <div className="rounded border border-slate-200 bg-white p-6 text-slate-500">Loading analytics&hellip;</div>;
}

function Error({ message }: { message: string }) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-6">
      <p className="font-medium text-red-900">Could not load analytics.</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
    </div>
  );
}

function extractErr(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message || e.message || 'Unknown error';
  }
  return 'Unknown error';
}

export default DashboardTab;
