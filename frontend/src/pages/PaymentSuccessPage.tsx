import { Link } from 'react-router-dom';

function PaymentSuccessPage() {
  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl">
            &#10003;
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-slate-900">
            You're enrolled!
          </h1>
          <p className="mt-2 text-slate-600">
            Welcome to the FAA Part 107 Remote Pilot Certification Course.
            You now have lifetime access to all 13 chapters, video lectures,
            and practice quizzes.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              to="/dashboard"
              className="block rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-light"
            >
              Go to your dashboard
            </Link>
            <Link
              to="/chapters/10000000-0000-0000-0000-000000000001"
              className="block rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand"
            >
              Start Chapter 1
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccessPage;
