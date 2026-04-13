import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { paymentsApi, type CouponValidation } from '../api/payments';

function CheckoutPage() {
  const user = useAuthStore((s) => s.user);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const basePrice = 9900; // cents
  const finalPrice = coupon ? coupon.finalPrice : basePrice;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    setCoupon(null);

    try {
      const result = await paymentsApi.validateCoupon(couponCode.trim());
      setCoupon(result);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setCouponError(e.response?.data?.message || e.message || 'Invalid coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    setCheckoutLoading(true);
    setError(null);

    try {
      const result = await paymentsApi.createCheckout(coupon ? coupon.code : undefined);
      // Redirect to Stripe's hosted checkout page
      window.location.href = result.checkoutUrl;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Could not start checkout');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              Enroll in Part 107 Course
            </h1>
            <p className="mt-1 text-slate-600">
              One-time payment, lifetime access
            </p>
          </div>

          {/* Course details */}
          <div className="rounded-lg bg-slate-50 p-4 mb-6">
            <h3 className="font-semibold text-slate-900">
              FAA Part 107 Remote Pilot Certification
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>13 chapters of expert instruction</li>
              <li>Video lectures for each chapter</li>
              <li>142 practice exam questions</li>
              <li>Lifetime access to all materials</li>
            </ul>
          </div>

          {/* Price */}
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-sm text-slate-600">Course price</span>
            <span className="text-sm text-slate-900">${(basePrice / 100).toFixed(2)}</span>
          </div>

          {coupon && (
            <div className="flex items-baseline justify-between mb-4 text-emerald-700">
              <span className="text-sm">
                Discount ({coupon.code})
              </span>
              <span className="text-sm">-${(coupon.discount / 100).toFixed(2)}</span>
            </div>
          )}

          <div className="flex items-baseline justify-between border-t border-slate-200 pt-4 mb-6">
            <span className="text-base font-semibold text-slate-900">Total</span>
            <span className="text-2xl font-bold text-slate-900">
              ${(finalPrice / 100).toFixed(2)}
            </span>
          </div>

          {/* Coupon input */}
          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                disabled={couponLoading || !!coupon}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50"
              />
              {coupon ? (
                <button
                  type="button"
                  onClick={() => {
                    setCoupon(null);
                    setCouponCode('');
                    setCouponError(null);
                  }}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {couponLoading ? 'Checking…' : 'Apply'}
                </button>
              )}
            </div>
            {couponError && (
              <p className="mt-1 text-xs text-red-600">{couponError}</p>
            )}
            {coupon && (
              <p className="mt-1 text-xs text-emerald-600">{coupon.description}</p>
            )}
          </div>

          {/* Checkout button */}
          <form onSubmit={handleCheckout}>
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={checkoutLoading}
              className="w-full rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-light disabled:opacity-60"
            >
              {checkoutLoading ? 'Redirecting to payment…' : `Pay $${(finalPrice / 100).toFixed(2)}`}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            Secure payment processed by Stripe.
            {user && <span> Purchasing as {user.email}.</span>}
          </p>

          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-slate-500 hover:text-brand">
              &larr; Back to course overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
