import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import ChaptersPage from './pages/ChaptersPage';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ChaptersPage />} />
            <Route path="/login" element={<LoginPage />} />
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
