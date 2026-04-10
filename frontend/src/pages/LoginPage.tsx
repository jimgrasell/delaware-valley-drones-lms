import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

interface LocationState {
  from?: { pathname: string };
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Where to send the user after successful login. If they were redirected
  // here from a protected page, return them; otherwise default to the
  // dashboard, which is the natural logged-in landing page.
  const from =
    (location.state as LocationState | null)?.from?.pathname || '/dashboard';

  // If already logged in, bounce to the destination immediately.
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Clear any stale error on mount.
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      // The store has already set the error message; nothing else to do.
    }
  };

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-600">
              Access your Part 107 course
            </p>
          </div>

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

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50"
                placeholder="••••••••"
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
              disabled={isLoading || !email || !password}
              className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-brand hover:text-brand-dark">
              Create one
            </Link>
          </div>

          <div className="mt-3 text-center text-xs text-slate-500">
            <Link to="/" className="hover:text-slate-700">
              ← Back to chapters
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Trouble signing in? Contact{' '}
          <a
            href="mailto:support@delawarevalleydrones.com"
            className="text-brand hover:underline"
          >
            support@delawarevalleydrones.com
          </a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
