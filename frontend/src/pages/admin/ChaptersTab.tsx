import { useEffect, useState } from 'react';
import { chaptersApi, type Chapter } from '../../api/chapters';
import { adminApi } from '../../api/admin';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; chapters: Chapter[] };

function ChaptersTab() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    chaptersApi
      .list()
      .then((res) => {
        if (!cancelled) {
          setState({ kind: 'success', chapters: res.data.chapters });
        }
      })
      .catch((err) => {
        if (!cancelled) setState({ kind: 'error', message: extractErr(err) });
      });
    return () => { cancelled = true; };
  }, []);

  const handleSave = async (id: string, title: string, description: string) => {
    try {
      await adminApi.updateChapter(id, { title, description });
      // Refresh the list
      setState((prev) => {
        if (prev.kind !== 'success') return prev;
        return {
          ...prev,
          chapters: prev.chapters.map((ch) =>
            ch.id === id ? { ...ch, title, description } : ch
          ),
        };
      });
      setEditingId(null);
    } catch (err) {
      alert('Failed to save: ' + extractErr(err));
    }
  };

  if (state.kind === 'loading') {
    return <div className="rounded border border-slate-200 bg-white p-6 text-slate-500">Loading chapters&hellip;</div>;
  }

  if (state.kind === 'error') {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-900">Could not load chapters.</p>
        <p className="mt-1 text-sm text-red-700">{state.message}</p>
      </div>
    );
  }

  const sorted = [...state.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);

  return (
    <div className="space-y-3">
      {sorted.map((ch) => (
        <div key={ch.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-4 p-4">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
              {ch.chapterNumber}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{ch.title}</p>
              <p className="mt-0.5 text-xs text-slate-500 truncate">{ch.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  ch.isPublished
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {ch.isPublished ? 'Published' : 'Draft'}
              </span>
              <span className="text-xs text-slate-400">
                {ch.quizCount} quiz{ch.quizCount === 1 ? '' : 'zes'}
              </span>
              <button
                type="button"
                onClick={() => setEditingId(editingId === ch.id ? null : ch.id)}
                className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {editingId === ch.id ? 'Cancel' : 'Edit'}
              </button>
            </div>
          </div>

          {editingId === ch.id && (
            <ChapterEditForm
              chapter={ch}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ChapterEditForm({
  chapter,
  onSave,
  onCancel,
}: {
  chapter: Chapter;
  onSave: (id: string, title: string, description: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(chapter.title);
  const [description, setDescription] = useState(chapter.description);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    await onSave(chapter.id, title, description);
    setSaving(false);
  };

  return (
    <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !title.trim()}
          className="rounded-md bg-brand px-4 py-2 text-xs font-medium text-white shadow transition hover:bg-brand-light disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function extractErr(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message || e.message || 'Unknown error';
  }
  return 'Unknown error';
}

export default ChaptersTab;
