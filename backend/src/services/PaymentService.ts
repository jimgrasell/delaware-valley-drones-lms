import Stripe from 'stripe';
import { AppDataSource } from '../config/database';
import { Payment, PaymentStatus } from '../models/Payment';
import { Coupon, CouponType } from '../models/Coupon';
import { Enrollment, EnrollmentStatus } from '../models/Enrollment';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

const COURSE_PRICE_CENTS = 9900; // $99.00

export class PaymentService {
  private paymentRepository = AppDataSource.getRepository(Payment);
  private couponRepository = AppDataSource.getRepository(Coupon);
  private enrollmentRepository = AppDataSource.getRepository(Enrollment);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Create a Stripe checkout session for course enrollment
   */
  async createCheckoutSession(userId: string, couponCode?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Check if user already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { studentId: userId, status: EnrollmentStatus.ACTIVE },
    });

    if (existingEnrollment) {
      throw new AppError('User is already enrolled in this course', 400, 'ALREADY_ENROLLED');
    }

    let amount = COURSE_PRICE_CENTS;
    let discount = 0;
    let coupon: Coupon | null = null;

    // Validate and apply coupon if provided
    if (couponCode) {
      coupon = await this.validateCoupon(couponCode);

      if (coupon) {
        discount = this.calculateDiscount(COURSE_PRICE_CENTS, coupon);
        amount = Math.max(0, COURSE_PRICE_CENTS - discount);
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'FAA Part 107 Remote Pilot Certification Course',
              description: 'Complete online course with 13 chapters, 113+ quiz questions, and lifetime access',
              images: [process.env.COURSE_IMAGE_URL || ''],
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
      customer_email: user.email,
      metadata: {
        userId,
        couponCode: couponCode || '',
        discountAmount: discount,
      },
      discounts: discount > 0 && coupon ? undefined : undefined,
    });

    // Create payment record
    const payment = this.paymentRepository.create({
      userId,
      amount,
      currency: 'usd',
      status: PaymentStatus.PENDING,
      stripePaymentIntentId: session.payment_intent as string,
      couponCode: couponCode,
      discountAmount: discount,
      description: 'FAA Part 107 Remote Pilot Certification Course',
    });

    await this.paymentRepository.save(payment);

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      amount,
      currency: 'usd',
      couponApplied: coupon ? { code: coupon.code, discount } : null,
    };
  }

  /**
   * Validate coupon code
   */
  async validateCoupon(code: string) {
    const coupon = await this.couponRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      throw new AppError('Coupon code not found', 404, 'COUPON_NOT_FOUND');
    }

    if (!coupon.isActive) {
      throw new AppError('Coupon is no longer active', 400, 'COUPON_INACTIVE');
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      throw new AppError('Coupon has expired', 400, 'COUPON_EXPIRED');
    }

    if (coupon.usageLimit > 0 && coupon.timesUsed >= coupon.usageLimit) {
      throw new AppError('Coupon usage limit reached', 400, 'COUPON_LIMIT_EXCEEDED');
    }

    return coupon;
  }

  /**
   * Handle Stripe webhook for successful payment
   */
  async handlePaymentIntentSucceeded(paymentIntentId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
      relations: ['user'],
    });

    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    // Mark payment as completed
    payment.status = PaymentStatus.COMPLETED;
    payment.completedAt = new Date();
    await this.paymentRepository.save(payment);

    // Create enrollment
    let enrollment = await this.enrollmentRepository.findOne({
      where: { studentId: payment.userId, status: EnrollmentStatus.ACTIVE },
    });

    if (!enrollment) {
      enrollment = this.enrollmentRepository.create({
        studentId: payment.userId,
        status: EnrollmentStatus.ACTIVE,
        createdAt: new Date(),
      });

      await this.enrollmentRepository.save(enrollment);
    }

    // Increment coupon usage if applicable
    if (payment.couponCode) {
      const coupon = await this.couponRepository.findOne({
        where: { code: payment.couponCode },
      });

      if (coupon) {
        coupon.timesUsed += 1;
        await this.couponRepository.save(coupon);
      }
    }

    return payment;
  }

  /**
   * Handle Stripe webhook for failed payment
   */
  async handlePaymentIntentFailed(paymentIntentId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    payment.status = PaymentStatus.FAILED;
    await this.paymentRepository.save(payment);

    return payment;
  }

  /**
   * Get payment details for user
   */
  async getPaymentHistory(userId: string) {
    const payments = await this.paymentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return {
      userId,
      totalPayments: payments.length,
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        couponCode: p.couponCode,
        discountAmount: p.discountAmount,
        createdAt: p.createdAt,
        completedAt: p.completedAt,
      })),
    };
  }

  /**
   * Calculate discount amount based on coupon
   */
  private calculateDiscount(baseAmount: number, coupon: Coupon): number {
    if (coupon.type === CouponType.PERCENTAGE) {
      return Math.round(baseAmount * (coupon.value / 100));
    } else {
      return Math.min(coupon.value, baseAmount);
    }
  }
}

export const paymentService = new PaymentService();
