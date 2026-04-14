import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { certificatesApi, type CertificateVerification } from '../api/certificates';

function extractErr(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message || e.message || 'Something went wrong';
  }
  return 'Something went wrong';
}

type State =
  | { kind: 'loading' }
  | { kind: 'verified'; data: CertificateVerification }
  | { kind: 'error'; message: string };

function VerifyCertificatePage() {
  const { verificationId } = useParams<{ verificationId: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!verificationId) return;
    certificatesApi
      .verify(verificationId)
      .then((data) => setState({ kind: 'verified', data }))
      .catch((err) => setState({ kind: 'error', message: extractErr(err) }));
  }, [verificationId]);

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {state.kind === 'loading' && (
          <div className="rounded border border-slate-200 bg-white p-6 text-center text-slate-500">
            Verifying certificate&hellip;
          </div>
        )}

        {state.kind === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
            <p className="font-medium text-red-900">Certificate not found</p>
            <p className="mt-1 text-sm text-red-700">{state.message}</p>
            <Link to="/" className="mt-4 inline-block text-sm text-brand hover:underline">
              Visit Delaware Valley Drones
            </Link>
          </div>
        )}

        {state.kind === 'verified' && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
                state.data.isValid
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {state.data.isValid ? '\u2713' : '\u2717'}
            </div>

            <h1 className="mt-4 text-xl font-semibold text-slate-900">
              {state.data.isValid ? 'Valid Certificate' : 'Invalid Certificate'}
            </h1>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-900">Student:</span>{' '}
                {state.data.studentName}
              </p>
              <p>
                <span className="font-medium text-slate-900">Course:</span>{' '}
                {state.data.courseName}
              </p>
              <p>
                <span className="font-medium text-slate-900">Score:</span>{' '}
                {Math.round(state.data.finalScore)}%
              </p>
              <p>
                <span className="font-medium text-slate-900">Completed:</span>{' '}
                {new Date(state.data.completionDate).toLocaleDateString()}
              </p>
              <p>
                <span className="font-medium text-slate-900">Issued:</span>{' '}
                {new Date(state.data.issuedAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Verification ID: {state.data.verificationId}
              </p>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                Verified by Delaware Valley Drones
              </p>
              <Link to="/" className="mt-2 inline-block text-sm text-brand hover:underline">
                learn.delawarevalleydrones.com
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyCertificatePage;
