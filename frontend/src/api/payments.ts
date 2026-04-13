import { apiClient } from './client';

export interface CheckoutResponse {
  sessionId: string;
  checkoutUrl: string;
  amount: number;
  currency: string;
  couponApplied: { code: string; discount: number } | null;
}

export interface CouponValidation {
  code: string;
  description: string;
  type: string;
  value: number;
  discount: number;
  finalPrice: number;
}

export const paymentsApi = {
  createCheckout: async (couponCode?: string): Promise<CheckoutResponse> => {
    const { data } = await apiClient.post<{ success: boolean; data: CheckoutResponse }>(
      '/payments/checkout',
      { couponCode }
    );
    return data.data;
  },

  validateCoupon: async (code: string): Promise<CouponValidation> => {
    const { data } = await apiClient.get<{ success: boolean; data: CouponValidation }>(
      '/payments/validate-coupon',
      { params: { code } }
    );
    return data.data;
  },
};
