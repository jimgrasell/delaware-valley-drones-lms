import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { adminService } from '../services/AdminService';
import { AppDataSource } from '../config/database';
import { Coupon } from '../models/Coupon';

const router = Router();

/**
 * GET /api/v1/admin/students
 * Get all enrolled students with progress overview
 * @authenticated admin/instructor
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20)
 * @returns {object} Paginated list of students with completion stats
 */
router.get(
  '/students',
  authMiddleware,
  requireRole(['admin', 'instructor']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await adminService.getStudents(page, limit);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/v1/admin/students/:id
 * Get detailed student progress and performance
 * @authenticated admin/instructor
 * @param {string} id - Student ID
 * @returns {object} Detailed student info with chapter progress breakdown
 */
router.get(
  '/students/:id',
  authMiddleware,
  requireRole(['admin', 'instructor']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const studentId = req.params.id;

    const result = await adminService.getStudentDetail(studentId);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/admin/chapters
 * Create new chapter
 * @authenticated admin/instructor
 * @body {string} title - Chapter title
 * @body {string} description - Chapter description
 * @body {number} chapterNumber - Sequential chapter number
 * @body {string} videoVimeoId - Optional Vimeo video ID
 * @returns {object} Created chapter details
 */
router.post(
  '/chapters',
  authMiddleware,
  requireRole(['admin', 'instructor']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { title, description, chapterNumber, videoVimeoId } = req.body;

    const chapter = await adminService.createChapter(title, description, chapterNumber, videoVimeoId);

    res.status(201).json({
      success: true,
      data: chapter,
    });
  })
);

/**
 * PUT /api/v1/admin/chapters/:id
 * Update existing chapter
 * @authenticated admin/instructor
 * @param {string} id - Chapter ID
 * @body {string} title - Updated title
 * @body {string} description - Updated description
 * @body {string} contentHtml - Updated HTML content
 * @body {string} videoVimeoId - Updated Vimeo video ID
 * @body {number} videoDurationSeconds - Video duration in seconds
 * @returns {object} Updated chapter details
 */
router.put(
  '/chapters/:id',
  authMiddleware,
  requireRole(['admin', 'instructor']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const chapterId = req.params.id;
    const { title, description, contentHtml, videoVimeoId, videoDurationSeconds } = req.body;

    const chapter = await adminService.updateChapter(
      chapterId,
      title,
      description,
      contentHtml,
      videoVimeoId,
      videoDurationSeconds
    );

    res.json({
      success: true,
      data: chapter,
    });
  })
);

/**
 * GET /api/v1/admin/analytics
 * Get comprehensive course analytics
 * @authenticated admin
 * @returns {object} Overview, quiz stats, chapter engagement data
 */
router.get(
  '/analytics',
  authMiddleware,
  requireRole(['admin']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const analytics = await adminService.getAnalytics();

    res.json({
      success: true,
      data: analytics,
    });
  })
);

/**
 * GET /api/v1/admin/analytics/payments
 * Get payment and revenue analytics
 * @authenticated admin
 * @returns {object} Payment summary, revenue breakdown by date, top coupons
 */
router.get(
  '/analytics/payments',
  authMiddleware,
  requireRole(['admin']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const paymentAnalytics = await adminService.getPaymentAnalytics();

    res.json({
      success: true,
      data: paymentAnalytics,
    });
  })
);

// ============================================
// Coupon management
// ============================================

const couponRepository = AppDataSource.getRepository(Coupon);

/**
 * GET /api/v1/admin/coupons
 */
router.get(
  '/coupons',
  authMiddleware,
  requireRole(['admin']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const coupons = await couponRepository.find({ order: { createdAt: 'DESC' } });
    res.json({ success: true, data: { coupons } });
  })
);

/**
 * POST /api/v1/admin/coupons
 */
router.post(
  '/coupons',
  authMiddleware,
  requireRole(['admin']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { code, description, type, value, usageLimit, expiresAt } = req.body;

    if (!code || !description || !type || value === undefined) {
      throw new AppError('Code, description, type, and value are required', 400, 'VALIDATION_ERROR');
    }

    const existing = await couponRepository.findOne({ where: { code: code.toUpperCase() } });
    if (existing) {
      throw new AppError('A coupon with this code already exists', 409, 'DUPLICATE_CODE');
    }

    const coupon = couponRepository.create({
      code: code.toUpperCase(),
      description,
      type,
      value,
      usageLimit: usageLimit || 0,
      isActive: true,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    await couponRepository.save(coupon);
    res.status(201).json({ success: true, data: coupon });
  })
);

/**
 * PUT /api/v1/admin/coupons/:id
 */
router.put(
  '/coupons/:id',
  authMiddleware,
  requireRole(['admin']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const coupon = await couponRepository.findOne({ where: { id: req.params.id } });
    if (!coupon) {
      throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }

    const { description, value, usageLimit, isActive, expiresAt } = req.body;
    if (description !== undefined) coupon.description = description;
    if (value !== undefined) coupon.value = value;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
    if (isActive !== undefined) coupon.isActive = isActive;
    if (expiresAt !== undefined) coupon.expiresAt = expiresAt ? new Date(expiresAt) : undefined;

    await couponRepository.save(coupon);
    res.json({ success: true, data: coupon });
  })
);

/**
 * DELETE /api/v1/admin/coupons/:id
 */
router.delete(
  '/coupons/:id',
  authMiddleware,
  requireRole(['admin']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const coupon = await couponRepository.findOne({ where: { id: req.params.id } });
    if (!coupon) {
      throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }

    await couponRepository.remove(coupon);
    res.json({ success: true, message: 'Coupon deleted' });
  })
);

export default router;
