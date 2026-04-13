import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

function Header() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="bg-brand text-white shadow">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="block">
          <h1 className="text-xl font-semibold tracking-tight">
            Delaware Valley Drones
          </h1>
          <p className="text-xs text-white/80 mt-0.5">
            FAA Part 107 Remote Pilot Certification
          </p>
        </Link>

        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="hidden sm:inline-block text-sm bg-white/10 hover:bg-white/20 transition rounded px-3 py-1.5"
            >
              Dashboard
            </Link>
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="hidden sm:inline-block text-sm bg-white/10 hover:bg-white/20 transition rounded px-3 py-1.5"
              >
                Admin
              </Link>
            )}
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-medium">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs text-white/70 capitalize">
                {user.role}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm bg-white/10 hover:bg-white/20 transition rounded px-3 py-1.5"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-sm bg-white/10 hover:bg-white/20 transition rounded px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="text-sm bg-white text-brand hover:bg-white/90 transition rounded px-3 py-1.5 font-medium"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
