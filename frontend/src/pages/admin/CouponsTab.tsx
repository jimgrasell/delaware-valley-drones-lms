import { useEffect, useState, type FormEvent } from 'react';
import { adminApi, type CouponData } from '../../api/admin';

function extractErr(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message || e.message || 'Something went wrong';
  }
  return 'Something went wrong';
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; coupons: CouponData[] };

function CouponsTab() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [showCreate, setShowCreate] = useState(false);

  const loadCoupons = () => {
    setState({ kind: 'loading' });
    adminApi
      .getCoupons()
      .then((coupons) => setState({ kind: 'success', coupons }))
      .catch((err) => setState({ kind: 'error', message: extractErr(err) }));
  };

  useEffect(() => { loadCoupons(); }, []);

  const handleCreated = () => {
    setShowCreate(false);
    loadCoupons();
  };

  const handleToggleActive = async (coupon: CouponData) => {
    try {
      await adminApi.updateCoupon(coupon.id, { isActive: !coupon.isActive });
      loadCoupons();
    } catch (err) {
      alert('Failed: ' + extractErr(err));
    }
  };

  const handleDelete = async (coupon: CouponData) => {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteCoupon(coupon.id);
      loadCoupons();
    } catch (err) {
      alert('Failed: ' + extractErr(err));
    }
  };

  if (state.kind === 'loading') {
    return <div className="rounded border border-slate-200 bg-white p-6 text-slate-500">Loading coupons&hellip;</div>;
  }

  if (state.kind === 'error') {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-900">Could not load coupons.</p>
        <p className="mt-1 text-sm text-red-700">{state.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{state.coupons.length} coupon{state.coupons.length === 1 ? '' : 's'}</p>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-brand-light"
        >
          {showCreate ? 'Cancel' : 'Create coupon'}
        </button>
      </div>

      {showCreate && <CreateCouponForm onCreated={handleCreated} />}

      {state.coupons.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white p-8 text-center text-slate-500">
          No coupons yet. Create one to offer discounts.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-medium text-slate-600">Code</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Description</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Discount</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Used</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-mono font-medium text-slate-900">{coupon.code}</td>
                  <td className="px-4 py-3 text-slate-600">{coupon.description}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {coupon.type === 'percentage'
                      ? `${coupon.value}%`
                      : `$${(coupon.value / 100).toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {coupon.timesUsed}
                    {coupon.usageLimit > 0 && ` / ${coupon.usageLimit}`}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        coupon.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(coupon)}
                        className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        {coupon.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(coupon)}
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreateCouponForm({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [value, setValue] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !description.trim() || !value) return;
    setSaving(true);
    setError(null);

    try {
      const numValue = type === 'percentage'
        ? parseFloat(value)
        : Math.round(parseFloat(value) * 100); // dollars to cents

      await adminApi.createCoupon({
        code: code.trim(),
        description: description.trim(),
        type,
        value: numValue,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : 0,
      });
      onCreated();
    } catch (err) {
      setError(extractErr(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">New coupon</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. FRIEND20"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 20% off for friends"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'percentage' | 'fixed_amount')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="percentage">Percentage off</option>
              <option value="fixed_amount">Fixed amount off</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {type === 'percentage' ? 'Percent (0-100)' : 'Amount ($)'}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'percentage' ? '20' : '25.00'}
              min="0"
              max={type === 'percentage' ? '100' : undefined}
              step={type === 'percentage' ? '1' : '0.01'}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Usage limit <span className="text-slate-400">(0 = unlimited)</span>
            </label>
            <input
              type="number"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving || !code.trim() || !description.trim() || !value}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-brand-light disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create coupon'}
        </button>
      </form>
    </div>
  );
}

export default CouponsTab;
