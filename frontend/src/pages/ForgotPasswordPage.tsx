import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError(null);

    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      let message = 'Something went wrong. Please try again.';
      if (err && typeof err === 'object') {
        const e = err as {
          response?: { data?: { message?: string; error?: string } };
          message?: string;
        };
        message = e.response?.data?.message || e.response?.data?.error || e.message || message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Reset your password</h2>
            <p className="mt-1 text-sm text-slate-600">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                If an account exists with that email, a password reset link has been sent.
                Check your inbox (and spam folder).
              </div>
              <div className="mt-6 text-sm text-slate-600">
                <Link to="/login" className="text-brand hover:text-brand-dark">
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50"
                    placeholder="you@example.com"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-600">
                Remember your password?{' '}
                <Link to="/login" className="text-brand hover:text-brand-dark">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
