import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { certificatesApi, type Certificate } from '../api/certificates';

function extractErr(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message || e.message || 'Something went wrong';
  }
  return 'Something went wrong';
}

type State =
  | { kind: 'loading' }
  | { kind: 'no-cert' }
  | { kind: 'has-cert'; cert: Certificate }
  | { kind: 'error'; message: string };

function CertificatePage() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    certificatesApi
      .getMyCertificate()
      .then((cert) => {
        setState(cert ? { kind: 'has-cert', cert } : { kind: 'no-cert' });
      })
      .catch((err) => setState({ kind: 'error', message: extractErr(err) }));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const cert = await certificatesApi.generate();
      setState({ kind: 'has-cert', cert });
    } catch (err) {
      setGenError(extractErr(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Certificate</h1>
        <p className="mt-1 text-slate-600">
          Your FAA Part 107 course completion certificate.
        </p>
      </div>

      {state.kind === 'loading' && (
        <div className="rounded border border-slate-200 bg-white p-6 text-slate-500">
          Loading&hellip;
        </div>
      )}

      {state.kind === 'error' && (
        <div className="rounded border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-900">Could not load certificate.</p>
          <p className="mt-1 text-sm text-red-700">{state.message}</p>
        </div>
      )}

      {state.kind === 'no-cert' && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            No certificate yet
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Complete all 13 chapters to earn your certificate of completion.
          </p>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="mt-6 rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-light disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Generate certificate'}
          </button>

          {genError && (
            <p className="mt-3 text-sm text-red-600">{genError}</p>
          )}

          <div className="mt-4">
            <Link to="/dashboard" className="text-sm text-slate-500 hover:text-brand">
              &larr; Back to dashboard
            </Link>
          </div>
        </div>
      )}

      {state.kind === 'has-cert' && (
        <CertificateView cert={state.cert} />
      )}
    </div>
  );
}

function CertificateView({ cert }: { cert: Certificate }) {
  const downloadUrl = `${import.meta.env.VITE_API_URL}/certificates/download/${cert.verificationId}`;
  const verifyUrl = `${window.location.origin}/verify/${cert.verificationId}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl">
        &#127942;
      </div>

      <h2 className="mt-4 text-xl font-semibold text-slate-900">
        Course Completed!
      </h2>

      <div className="mt-4 space-y-1 text-sm text-slate-600">
        <p>
          <span className="font-medium text-slate-900">Final Score:</span>{' '}
          {Math.round(cert.finalScore)}%
        </p>
        <p>
          <span className="font-medium text-slate-900">Completed:</span>{' '}
          {new Date(cert.completionDate).toLocaleDateString()}
        </p>
        <p>
          <span className="font-medium text-slate-900">Verification ID:</span>{' '}
          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
            {cert.verificationId}
          </code>
        </p>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white shadow transition hover:bg-brand-light"
        >
          Download certificate
        </a>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(verifyUrl);
            alert('Verification link copied!');
          }}
          className="rounded-md border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand"
        >
          Copy verification link
        </button>
      </div>

      <div className="mt-6">
        <Link to="/dashboard" className="text-sm text-slate-500 hover:text-brand">
          &larr; Back to dashboard
        </Link>
      </div>
    </div>
  );
}

export default CertificatePage;
