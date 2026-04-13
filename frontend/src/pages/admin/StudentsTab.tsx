import { useEffect, useState, useCallback } from 'react';
import {
  adminApi,
  type StudentSummary,
  type StudentDetail,
  type Pagination,
} from '../../api/admin';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; students: StudentSummary[]; pagination: Pagination };

function StudentsTab() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadPage = useCallback((p: number) => {
    setState({ kind: 'loading' });
    adminApi
      .getStudents(p, 20)
      .then((data) => {
        setState({ kind: 'success', students: data.students, pagination: data.pagination });
        setPage(p);
      })
      .catch((err) => setState({ kind: 'error', message: extractErr(err) }));
  }, []);

  useEffect(() => { loadPage(1); }, [loadPage]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const d = await adminApi.getStudentDetail(id);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  if (state.kind === 'loading') {
    return <div className="rounded border border-slate-200 bg-white p-6 text-slate-500">Loading students&hellip;</div>;
  }

  if (state.kind === 'error') {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-900">Could not load students.</p>
        <p className="mt-1 text-sm text-red-700">{state.message}</p>
      </div>
    );
  }

  const { students, pagination } = state;

  return (
    <div>
      {students.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white p-6 text-slate-500 text-center">
          No enrolled students yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Progress</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Avg Score</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Joined</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <StudentRow
                  key={s.id}
                  student={s}
                  isExpanded={expandedId === s.id}
                  detail={expandedId === s.id ? detail : null}
                  detailLoading={expandedId === s.id && detailLoading}
                  onToggle={() => handleExpand(s.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {pagination.page} of {pagination.pages} ({pagination.total} students)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => loadPage(page - 1)}
              className="rounded border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= pagination.pages}
              onClick={() => loadPage(page + 1)}
              className="rounded border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentRow({
  student,
  isExpanded,
  detail,
  detailLoading,
  onToggle,
}: {
  student: StudentSummary;
  isExpanded: boolean;
  detail: StudentDetail | null;
  detailLoading: boolean;
  onToggle: () => void;
}) {
  const { completionStats } = student;
  return (
    <>
      <tr
        className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 transition"
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-medium text-slate-900">{student.name}</td>
        <td className="px-4 py-3 text-slate-600">{student.email}</td>
        <td className="px-4 py-3 text-right text-slate-700">
          {completionStats.completedChapters}/{completionStats.totalChapters}
          <span className="ml-1 text-slate-400">({completionStats.completionPercentage}%)</span>
        </td>
        <td className="px-4 py-3 text-right text-slate-700">
          {Math.round(completionStats.averageScore)}%
        </td>
        <td className="px-4 py-3 text-right text-slate-500">
          {new Date(student.createdAt).toLocaleDateString()}
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={5} className="bg-slate-50 px-6 py-4">
            {detailLoading && <p className="text-sm text-slate-500">Loading details&hellip;</p>}
            {!detailLoading && detail && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Per-chapter progress
                </p>
                <div className="grid gap-2">
                  {[...detail.chapterProgress]
                    .sort((a, b) => a.chapterNumber - b.chapterNumber)
                    .map((cp) => (
                      <div
                        key={cp.chapterId}
                        className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <span className="w-6 text-right text-slate-400 font-mono">
                          {cp.chapterNumber}
                        </span>
                        <span className="flex-1 text-slate-800">{cp.title}</span>
                        <StatusBadge status={cp.status} />
                        {cp.quizPassed && (
                          <span className="text-xs text-emerald-600">
                            Quiz: {cp.bestQuizScore}%
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
            {!detailLoading && !detail && (
              <p className="text-sm text-red-600">Could not load student details.</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    not_started: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-amber-50 text-amber-700',
    completed: 'bg-emerald-50 text-emerald-700',
  };
  const labels: Record<string, string> = {
    not_started: 'Not started',
    in_progress: 'In progress',
    completed: 'Completed',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.not_started}`}>
      {labels[status] || status}
    </span>
  );
}

function extractErr(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message || e.message || 'Unknown error';
  }
  return 'Unknown error';
}

export default StudentsTab;
