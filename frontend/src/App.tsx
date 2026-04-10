import ChaptersPage from './pages/ChaptersPage';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand text-white shadow">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Delaware Valley Drones
            </h1>
            <p className="text-xs text-white/80 mt-0.5">
              FAA Part 107 Remote Pilot Certification
            </p>
          </div>
          <a
            href="#"
            className="text-sm bg-white/10 hover:bg-white/20 transition rounded px-3 py-1.5"
          >
            Sign in
          </a>
        </div>
      </header>

      <main className="flex-1">
        <ChaptersPage />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 text-xs text-slate-500 text-center">
          &copy; {new Date().getFullYear()} Delaware Valley Drones &middot; FAA
          Part 107 Course
        </div>
      </footer>
    </div>
  );
}

export default App;
