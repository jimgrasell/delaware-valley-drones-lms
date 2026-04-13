import { Router, Response, Request } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { paymentService } from '../services/PaymentService';
import Stripe from 'stripe';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

/**
 * POST /api/v1/payments/checkout
 * Create Stripe checkout session for course enrollment
 * @authenticated student
 * @body {string} couponCode - Optional coupon code for discount
 * @returns {object} Stripe checkout session URL and details
 */
router.post(
  '/checkout',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { couponCode } = req.body;

    const checkoutSession = await paymentService.createCheckoutSession(userId, couponCode);

    res.json({
      success: true,
      data: checkoutSession,
    });
  })
);

/**
 * GET /api/v1/payments/validate-coupon
 * Validate coupon code and calculate discount
 * @query {string} code - Coupon code to validate
 * @returns {object} Coupon details and discount amount
 */
router.get(
  '/validate-coupon',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      throw new AppError('Coupon code is required', 400, 'VALIDATION_ERROR');
    }

    const coupon = await paymentService.validateCoupon(code);
    const coursePrice = 9900; // $99.00 in cents
    const discount =
      coupon.type === 'percentage'
        ? Math.round(coursePrice * (coupon.value / 100))
        : Math.min(coupon.value, coursePrice);

    res.json({
      success: true,
      data: {
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        discount,
        finalPrice: coursePrice - discount,
      },
    });
  })
);

/**
 * GET /api/v1/payments/history
 * Get payment history for authenticated user
 * @authenticated student
 * @returns {object} List of all payments made by user
 */
router.get(
  '/history',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const history = await paymentService.getPaymentHistory(userId);

    res.json({
      success: true,
      data: history,
    });
  })
);

/**
 * POST /api/v1/payments/webhook
 * Stripe webhook handler for payment events
 * Handles: payment_intent.succeeded, payment_intent.payment_failed
 * @raw Raw request body for Stripe signature verification
 */
router.post(
  '/webhook',
  asyncHandler(async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      throw new AppError('Missing Stripe signature', 400, 'MISSING_SIGNATURE');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err) {
      throw new AppError('Webhook signature verification failed', 400, 'INVALID_SIGNATURE');
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await paymentService.handlePaymentIntentSucceeded(paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await paymentService.handlePaymentIntentFailed(paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  })
);

export default router;
