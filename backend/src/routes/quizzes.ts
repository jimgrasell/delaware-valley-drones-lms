import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { quizService } from '../services/QuizService';

const router = Router();

/**
 * GET /api/v1/quizzes/:id
 * Get quiz questions and start a new attempt
 * @authenticated student/instructor/admin
 * @param {string} id - Quiz ID
 * @returns {object} Quiz with questions and attemptId
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizId = req.params.id;
    const userId = req.user!.id;

    const quizQuestions = await quizService.getQuizQuestions(quizId, userId);

    res.json({
      success: true,
      data: quizQuestions,
    });
  })
);

/**
 * POST /api/v1/quizzes/:id/submit
 * Submit quiz answers and get graded results
 * @authenticated student
 * @param {string} id - Quiz ID
 * @body {string} attemptId - Quiz attempt ID
 * @body {array} answers - Array of {questionId, selectedOptionId, answerText}
 * @returns {object} Grading result with score, passed status, etc.
 */
router.post(
  '/:id/submit',
  requireRole(['student', 'instructor', 'admin']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizId = req.params.id;
    const userId = req.user!.id;
    const { attemptId, answers } = req.body;

    if (!attemptId) {
      return res.status(400).json({
        success: false,
        error: 'Attempt ID is required',
      });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        error: 'Answers must be an array',
      });
    }

    const result = await quizService.submitQuiz(quizId, userId, attemptId, answers);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/v1/quizzes/:id/attempts
 * Get all quiz attempts for this user on this quiz
 * @authenticated student
 * @param {string} id - Quiz ID
 * @returns {object} Attempt history with all attempts
 */
router.get(
  '/:id/attempts',
  requireRole(['student', 'instructor', 'admin']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizId = req.params.id;
    const userId = req.user!.id;

    const history = await quizService.getAttemptHistory(quizId, userId);

    res.json({
      success: true,
      data: history,
    });
  })
);

/**
 * GET /api/v1/quizzes/attempts/:attemptId/results
 * Get detailed results for a specific attempt
 * @authenticated student
 * @param {string} attemptId - Attempt ID
 * @returns {object} Detailed attempt results with answers and feedback
 */
router.get(
  '/attempts/:attemptId/results',
  requireRole(['student', 'instructor', 'admin']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const attemptId = req.params.attemptId;
    const userId = req.user!.id;

    const results = await quizService.getAttemptResults(attemptId, userId);

    res.json({
      success: true,
      data: results,
    });
  })
);

export default router;
