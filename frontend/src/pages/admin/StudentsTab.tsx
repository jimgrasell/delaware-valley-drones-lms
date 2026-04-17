import { useEffect, useState, useCallback } from 'react';
import {
  adminApi,
  type StudentSummary,
  type StudentDetail,
  type StudentPayment,
  type Pagination,
} from '../../api/admin';

function extractErr(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message || e.message || 'Unknown error';
  }
  return 'Unknown error';
}

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

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const d = await adminApi.getStudentDetail(id);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    await loadDetail(id);
  };

  const refreshDetail = async () => {
    if (expandedId) await loadDetail(expandedId);
    loadPage(page);
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
                <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
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
                  onRefresh={refreshDetail}
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
  onRefresh,
}: {
  student: StudentSummary;
  isExpanded: boolean;
  detail: StudentDetail | null;
  detailLoading: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <tr
        className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 transition"
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-medium text-slate-900">{student.name}</td>
        <td className="px-4 py-3 text-slate-600">{student.email}</td>
        <td className="px-4 py-3 text-right text-slate-700">
          {student.completedChapters}/{student.totalChapters}
          <span className="ml-1 text-slate-400">({Math.round(student.completionPercentage)}%)</span>
        </td>
        <td className="px-4 py-3 text-right text-slate-700">
          {Math.round(student.averageQuizScore)}%
        </td>
        <td className="px-4 py-3 text-right text-slate-500">
          {new Date(student.createdAt).toLocaleDateString()}
        </td>
        <td className="px-4 py-3 text-center">
          {student.isActive ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Active
            </span>
          ) : (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
              Inactive
            </span>
          )}
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={6} className="bg-slate-50 px-6 py-4">
            {detailLoading && <p className="text-sm text-slate-500">Loading details&hellip;</p>}
            {!detailLoading && detail && (
              <StudentDetailPanel detail={detail} onRefresh={onRefresh} />
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

function StudentDetailPanel({
  detail,
  onRefresh,
}: {
  detail: StudentDetail;
  onRefresh: () => void;
}) {
  const handleDeactivate = async () => {
    if (!confirm(`Deactivate ${detail.name}? They will no longer be able to sign in.`)) return;
    try {
      await adminApi.deactivateStudent(detail.id);
      onRefresh();
    } catch (err) {
      alert('Failed to deactivate: ' + extractErr(err));
    }
  };

  const handleReactivate = async () => {
    try {
      await adminApi.reactivateStudent(detail.id);
      onRefresh();
    } catch (err) {
      alert('Failed to reactivate: ' + extractErr(err));
    }
  };

  return (
    <div className="space-y-5">
      {/* Account metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
        <InfoBox label="Account created" value={new Date(detail.createdAt).toLocaleDateString()} />
        <InfoBox
          label="Enrolled"
          value={
            detail.enrolledAt
              ? new Date(detail.enrolledAt).toLocaleDateString()
              : 'Not enrolled'
          }
        />
        <InfoBox label="Account status" value={detail.isActive ? 'Active' : 'Inactive'} />
        <InfoBox label="Enrollment status" value={detail.status || '—'} />
      </div>

      {/* Admin actions */}
      <div className="flex flex-wrap gap-2">
        {detail.isActive ? (
          <button
            type="button"
            onClick={handleDeactivate}
            className="rounded border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            Deactivate account
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReactivate}
            className="rounded border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            Reactivate account
          </button>
        )}
      </div>

      {/* Payments */}
      {detail.payments.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Payments
          </p>
          <div className="space-y-2">
            {detail.payments.map((p) => (
              <PaymentRow key={p.id} payment={p} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      )}

      {/* Chapter progress */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Per-chapter progress
        </p>
        <div className="grid gap-2">
          {detail.chapterProgress.map((cp) => (
            <div
              key={cp.chapterId}
              className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span className="w-8 text-right text-slate-400 font-mono">
                Ch {cp.chapterNumber}
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
    </div>
  );
}

function PaymentRow({
  payment,
  onRefresh,
}: {
  payment: StudentPayment;
  onRefresh: () => void;
}) {
  const [refunding, setRefunding] = useState(false);

  const handleRefund = async () => {
    const dollars = (payment.amount / 100).toFixed(2);
    if (!confirm(`Issue a full refund of $${dollars} via Stripe? This cannot be undone and will cancel the student's enrollment.`)) return;
    setRefunding(true);
    try {
      await adminApi.refundPayment(payment.id);
      onRefresh();
    } catch (err) {
      alert('Refund failed: ' + extractErr(err));
    } finally {
      setRefunding(false);
    }
  };

  const canRefund = payment.status === 'completed';

  return (
    <div className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-2 text-sm">
      <span className="font-mono text-slate-900">
        ${(payment.amount / 100).toFixed(2)}
      </span>
      <span className="text-xs text-slate-500">
        {new Date(payment.createdAt).toLocaleDateString()}
      </span>
      {payment.couponCode && (
        <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
          {payment.couponCode}
          {payment.discountAmount > 0 && ` (−$${(payment.discountAmount / 100).toFixed(2)})`}
        </span>
      )}
      <PaymentStatusBadge status={payment.status} />
      <span className="flex-1" />
      {canRefund && (
        <button
          type="button"
          onClick={handleRefund}
          disabled={refunding}
          className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {refunding ? 'Refunding…' : 'Refund'}
        </button>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-amber-50 text-amber-700',
    failed: 'bg-red-50 text-red-700',
    refunded: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
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

export default StudentsTab;
