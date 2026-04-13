import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import ChaptersPage from './pages/ChaptersPage';
import ChapterDetailPage from './pages/ChapterDetailPage';
import QuizPage from './pages/QuizPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ChaptersPage />} />
            <Route
              path="/chapters/:id"
              element={
                <ProtectedRoute>
                  <ChapterDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chapters/:chapterId/quiz"
              element={
                <ProtectedRoute>
                  <QuizPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireRole="admin">
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            {/* Catch-all: anything we don't recognize sends the user home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="max-w-5xl mx-auto px-6 py-4 text-xs text-slate-500 text-center">
            &copy; {new Date().getFullYear()} Delaware Valley Drones &middot; FAA
            Part 107 Course
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
