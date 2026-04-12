import { Router, Response } from 'express';
import { AuthRequest, optionalAuth, authMiddleware } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { chapterService } from '../services/ChapterService';

const router = Router();

/**
 * GET /api/v1/chapters
 * Get all chapters with optional student progress
 */
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const chapters = await chapterService.getChapters(req.user?.id);

    res.json({
      success: true,
      message: 'Chapters retrieved successfully',
      data: {
        total: chapters.length,
        chapters,
      },
    });
  })
);

/**
 * GET /api/v1/chapters/:id
 * Get single chapter details
 */
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const chapter = await chapterService.getChapter(req.params.id, req.user?.id);

    // Admins and instructors bypass the progression gate entirely —
    // they need to preview/grade any chapter regardless of completion.
    const isPrivileged =
      req.user?.role === 'admin' || req.user?.role === 'instructor';

    if (!isPrivileged) {
      const canAccess = await chapterService.canAccessChapter(
        req.params.id,
        req.user?.id
      );
      if (!canAccess && req.user) {
        throw new AppError(
          'This chapter is not yet available',
          403,
          'CHAPTER_LOCKED'
        );
      }
    }

    res.json({
      success: true,
      message: 'Chapter retrieved successfully',
      data: chapter,
    });
  })
);

/**
 * GET /api/v1/chapters/:id/quizzes
 * Get chapter quizzes
 */
router.get(
  '/:id/quizzes',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizzes = await chapterService.getChapterQuizzes(req.params.id);

    res.json({
      success: true,
      message: 'Quizzes retrieved successfully',
      data: {
        chapterId: req.params.id,
        total: quizzes.length,
        quizzes,
      },
    });
  })
);

/**
 * PUT /api/v1/chapters/:id/mark-watched
 * Mark chapter video as watched
 */
router.put(
  '/:id/mark-watched',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await chapterService.markVideoWatched(req.params.id, req.user!.id);

    res.json({
      success: true,
      message: 'Chapter marked as watched',
      data: result,
    });
  })
);

/**
 * PUT /api/v1/chapters/:id/video-progress
 * Update video progress (for resume)
 */
router.put(
  '/:id/video-progress',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { progress } = req.body;

    if (progress === undefined || typeof progress !== 'number') {
      throw new AppError('Progress value is required and must be a number', 400, 'VALIDATION_ERROR');
    }

    const result = await chapterService.updateVideoProgress(req.params.id, req.user!.id, progress);

    res.json({
      success: true,
      message: 'Video progress updated',
      data: result,
    });
  })
);

/**
 * PUT /api/v1/chapters/:id/mark-completed
 * Mark chapter as completed (after quiz passed)
 */
router.put(
  '/:id/mark-completed',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await chapterService.markChapterCompleted(req.params.id, req.user!.id);

    res.json({
      success: true,
      message: 'Chapter marked as completed',
      data: result,
    });
  })
);

export default router;
