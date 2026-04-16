import { useState, useEffect } from 'react';
import DashboardTab from './admin/DashboardTab';
import StudentsTab from './admin/StudentsTab';
import ChaptersTab from './admin/ChaptersTab';
import CouponsTab from './admin/CouponsTab';

const TABS = ['dashboard', 'students', 'chapters', 'coupons'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  dashboard: 'Dashboard',
  students: 'Students',
  chapters: 'Chapters',
  coupons: 'Coupons',
};

function getTabFromHash(): Tab {
  const hash = window.location.hash.replace('#', '');
  return TABS.includes(hash as Tab) ? (hash as Tab) : 'dashboard';
}

function AdminPage() {
  const [tab, setTab] = useState<Tab>(getTabFromHash);

  useEffect(() => {
    const onHashChange = () => setTab(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const switchTab = (t: Tab) => {
    window.location.hash = t;
    setTab(t);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Console</h1>
        <p className="mt-1 text-slate-600">
          Manage your Part 107 course, students, and content.
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={`pb-3 text-sm font-medium transition ${
                tab === t
                  ? 'border-b-2 border-brand text-brand'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'students' && <StudentsTab />}
      {tab === 'chapters' && <ChaptersTab />}
      {tab === 'coupons' && <CouponsTab />}
    </div>
  );
}

export default AdminPage;
