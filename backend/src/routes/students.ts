import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { studentService } from '../services/StudentService';

const router = Router();

/**
 * GET /api/v1/students/dashboard
 * Get student dashboard with overall progress
 */
router.get(
  '/dashboard',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const dashboard = await studentService.getDashboard(req.user!.id);

    res.json({
      success: true,
      message: 'Dashboard retrieved successfully',
      data: dashboard,
    });
  })
);

/**
 * GET /api/v1/students/progress
 * Get detailed chapter progress
 */
router.get(
  '/progress',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const progress = await studentService.getProgress(req.user!.id);

    res.json({
      success: true,
      message: 'Progress retrieved successfully',
      data: progress,
    });
  })
);

/**
 * GET /api/v1/students/gradebook
 * Get student quiz scores and gradebook
 */
router.get(
  '/gradebook',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const gradebook = await studentService.getGradebook(req.user!.id);

    res.json({
      success: true,
      message: 'Gradebook retrieved successfully',
      data: gradebook,
    });
  })
);

/**
 * GET /api/v1/students/profile
 * Get student profile
 */
router.get(
  '/profile',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await studentService.getProfile(req.user!.id);

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: profile,
    });
  })
);

/**
 * PUT /api/v1/students/profile
 * Update student profile
 */
router.put(
  '/profile',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { firstName, lastName, phone, bio, profilePhotoUrl } = req.body;

    // Build updates object with only provided fields
    const updates: any = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (bio !== undefined) updates.bio = bio;
    if (profilePhotoUrl !== undefined) updates.profilePhotoUrl = profilePhotoUrl;

    const profile = await studentService.updateProfile(req.user!.id, updates);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile,
    });
  })
);

/**
 * GET /api/v1/students/certificate
 * Get student certificate
 */
router.get(
  '/certificate',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const certificate = await studentService.getCertificate(req.user!.id);

    res.json({
      success: true,
      message: 'Certificate retrieved successfully',
      data: certificate,
    });
  })
);

/**
 * GET /api/v1/students/enrollment
 * Get active enrollment
 */
router.get(
  '/enrollment',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const enrollment = await studentService.getActiveEnrollment(req.user!.id);

    res.json({
      success: true,
      message: 'Enrollment retrieved successfully',
      data: {
        id: enrollment.id,
        status: enrollment.status,
        progress: enrollment.progress,
        completedChapters: enrollment.completedChapters,
        certificateIssued: enrollment.certificateIssued,
        createdAt: enrollment.createdAt,
      },
    });
  })
);

export default router;
