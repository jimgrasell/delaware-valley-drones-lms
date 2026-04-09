import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, optionalAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { forumService } from '../services/ForumService';

const router = Router();

/**
 * GET /api/v1/forum/posts
 * Get all forum posts with pagination
 * @authenticated optional (anyone can view)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Posts per page (default: 20)
 * @query {string} sort - Sort by: 'latest' or 'pinned' (default: latest)
 * @returns {object} Paginated list of forum posts
 */
router.get(
  '/posts',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = (req.query.sort as 'latest' | 'pinned') || 'latest';

    const result = await forumService.getPosts(page, limit, sortBy);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/forum/posts
 * Create new forum post
 * @authenticated student/instructor/admin
 * @body {string} title - Post title (10-200 chars)
 * @body {string} content - Post content (min 20 chars)
 * @body {array} tags - Optional array of tags
 * @returns {object} Created forum post
 */
router.post(
  '/posts',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { title, content, tags } = req.body;

    const post = await forumService.createPost(userId, title, content, tags);

    res.status(201).json({
      success: true,
      data: post,
    });
  })
);

/**
 * GET /api/v1/forum/posts/:id
 * Get forum post details with all replies
 * @authenticated optional
 * @param {string} id - Post ID
 * @returns {object} Post details with replies
 */
router.get(
  '/posts/:id',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const postId = req.params.id;

    const post = await forumService.getPost(postId);

    res.json({
      success: true,
      data: post,
    });
  })
);

/**
 * PUT /api/v1/forum/posts/:id
 * Update forum post
 * @authenticated student/instructor/admin (post author or admin)
 * @param {string} id - Post ID
 * @body {string} title - Updated title
 * @body {string} content - Updated content
 * @returns {object} Updated post
 */
router.put(
  '/posts/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { title, content } = req.body;

    const post = await forumService.updatePost(postId, userId, userRole, title, content);

    res.json({
      success: true,
      data: post,
    });
  })
);

/**
 * DELETE /api/v1/forum/posts/:id
 * Delete forum post
 * @authenticated student/instructor/admin (post author or admin)
 * @param {string} id - Post ID
 * @returns {object} Deletion confirmation
 */
router.delete(
  '/posts/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await forumService.deletePost(postId, userId, userRole);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/forum/posts/:id/pin
 * Pin/unpin forum post (admin only)
 * @authenticated admin
 * @param {string} id - Post ID
 * @body {boolean} isPinned - Pin status
 * @returns {object} Updated pin status
 */
router.post(
  '/posts/:id/pin',
  requireRole('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const { isPinned } = req.body;

    const result = await forumService.togglePinPost(postId, isPinned);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/forum/posts/:id/close
 * Close/reopen forum post (admin only)
 * @authenticated admin
 * @param {string} id - Post ID
 * @body {boolean} isClosed - Close status
 * @returns {object} Updated close status
 */
router.post(
  '/posts/:id/close',
  requireRole('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const { isClosed } = req.body;

    const result = await forumService.toggleClosePost(postId, isClosed);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/forum/posts/:id/replies
 * Create reply to forum post
 * @authenticated student/instructor/admin
 * @param {string} id - Post ID
 * @body {string} content - Reply content (min 10 chars)
 * @returns {object} Created reply
 */
router.post(
  '/posts/:id/replies',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const userId = req.user!.id;
    const { content } = req.body;

    const reply = await forumService.createReply(postId, userId, content);

    res.status(201).json({
      success: true,
      data: reply,
    });
  })
);

/**
 * PUT /api/v1/forum/replies/:id
 * Update forum reply
 * @authenticated student/instructor/admin (reply author or admin)
 * @param {string} id - Reply ID
 * @body {string} content - Updated content
 * @returns {object} Updated reply
 */
router.put(
  '/replies/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const replyId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { content } = req.body;

    const reply = await forumService.updateReply(replyId, userId, userRole, content);

    res.json({
      success: true,
      data: reply,
    });
  })
);

/**
 * DELETE /api/v1/forum/replies/:id
 * Delete forum reply
 * @authenticated student/instructor/admin (reply author or admin)
 * @param {string} id - Reply ID
 * @returns {object} Deletion confirmation
 */
router.delete(
  '/replies/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const replyId = req.params.id;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await forumService.deleteReply(replyId, userId, userRole);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/v1/forum/replies/:id/mark-answer
 * Mark reply as correct answer
 * @authenticated student/instructor/admin (post author only)
 * @param {string} id - Reply ID
 * @body {string} postId - Post ID
 * @returns {object} Updated reply status
 */
router.post(
  '/replies/:id/mark-answer',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const replyId = req.params.id;
    const userId = req.user!.id;
    const { postId } = req.body;

    const result = await forumService.markAsAnswer(replyId, postId, userId);

    res.json({
      success: true,
      data: result,
    });
  })
);

export default router;
