import { Link } from 'react-router-dom';

function PaymentCancelledPage() {
  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            Payment cancelled
          </h1>
          <p className="mt-2 text-slate-600">
            No worries — you weren't charged. You can try again whenever you're ready.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              to="/checkout"
              className="block rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-light"
            >
              Try again
            </Link>
            <Link
              to="/"
              className="block text-sm text-slate-500 hover:text-brand"
            >
              Back to course overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentCancelledPage;
