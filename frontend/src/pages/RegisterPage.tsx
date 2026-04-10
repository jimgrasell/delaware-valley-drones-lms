import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

const PASSWORD_MIN_LENGTH = 8;

function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const isLoading = useAuthStore((s) => s.isLoading);
  const serverError = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  // Already logged in? Skip the form and go straight to the dashboard.
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear any stale store error on mount.
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Validate the form locally before hitting the server. Returns the
  // first error found, or null if everything looks fine.
  const validate = (): string | null => {
    if (!firstName.trim()) return 'First name is required.';
    if (!lastName.trim()) return 'Last name is required.';
    if (!email.trim()) return 'Email is required.';
    // Bare-bones email format check; the backend does its own validation
    // and will reject anything truly malformed.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return 'Please enter a valid email address.';
    if (password.length < PASSWORD_MIN_LENGTH)
      return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setClientError(validationError);
      return;
    }
    setClientError(null);
    clearError();

    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });
      navigate('/dashboard', { replace: true });
    } catch {
      // The store has set serverError; nothing else to do.
    }
  };

  // Show whichever error is most relevant: client-side wins until the
  // user edits, then any server error replaces it.
  const errorMessage = clientError || serverError;

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">
              Create your account
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Start your FAA Part 107 course
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-slate-700"
                >
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setClientError(null);
                  }}
                  disabled={isLoading}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50"
                  placeholder="Jane"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-slate-700"
                >
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setClientError(null);
                  }}
                  disabled={isLoading}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50"
                  placeholder="Doe"
                />
              </div>
            </div>

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
                onChange={(e) => {
                  setEmail(e.target.value);
                  setClientError(null);
                }}
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
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setClientError(null);
                }}
                disabled={isLoading}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50"
                placeholder="At least 8 characters"
              />
              <p className="mt-1 text-xs text-slate-500">
                Must be at least {PASSWORD_MIN_LENGTH} characters.
              </p>
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
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setClientError(null);
                }}
                disabled={isLoading}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50"
                placeholder="Re-enter your password"
              />
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="text-brand hover:text-brand-dark">
              Sign in
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          By creating an account, you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
