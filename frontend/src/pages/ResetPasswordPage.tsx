import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 shadow-sm text-center">
            <p className="font-medium text-red-900">Invalid reset link.</p>
            <p className="mt-1 text-sm text-red-700">
              This link is missing the reset token. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="mt-4 inline-block text-sm text-brand hover:text-brand-dark"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const passwordsMatch = newPassword === confirmPassword;
  const passwordLongEnough = newPassword.length >= 8;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!passwordsMatch || !passwordLongEnough) return;

    setIsLoading(true);
    setError(null);

    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: unknown) {
      let message = 'Something went wrong. The link may have expired.';
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
            <h2 className="text-2xl font-semibold text-slate-900">Set new password</h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose a new password for your account.
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                Your password has been reset successfully.
              </div>
              <Link
                to="/login"
                className="mt-6 inline-block rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-brand-light"
              >
                Sign in with new password
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-slate-700"
                >
                  New password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50"
                  placeholder="At least 8 characters"
                />
                {newPassword.length > 0 && !passwordLongEnough && (
                  <p className="mt-1 text-xs text-red-600">Must be at least 8 characters.</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-700"
                >
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50"
                  placeholder="Repeat your password"
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
                )}
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
                disabled={isLoading || !passwordLongEnough || !passwordsMatch}
                className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
