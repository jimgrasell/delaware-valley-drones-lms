import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authService } from '../services/AuthService';
import pino from 'pino';

const router = Router();
const logger = pino();
const userRepository = AppDataSource.getRepository(User);

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post(
  '/register',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      throw new AppError('Missing required fields: email, password, firstName, lastName', 400, 'VALIDATION_ERROR');
    }

    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400, 'WEAK_PASSWORD');
    }

     // Create user
     const user = await authService.createUser(email, password, firstName, lastName, UserRole.STUDENT);

    // Generate tokens
    const tokens = authService.generateTokens(user);

    // Update last login
    await authService.updateLastLogin(user.id);

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: user.toJSON(),
      tokens,
    });
  })
);

/**
 * POST /api/v1/auth/login
 * Login user
 */
router.post(
  '/login',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
    }

    // Validate credentials
    const user = await authService.validateCredentials(email, password);

    // Generate tokens
    const tokens = authService.generateTokens(user);

    // Update last login
    await authService.updateLastLogin(user.id);

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      user: user.toJSON(),
      tokens,
    });
  })
);

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, 'VALIDATION_ERROR');
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      tokens,
    });
  })
);

/**
 * POST /api/v1/auth/logout
 * Logout user (client-side token deletion)
 */
router.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Token invalidation would require a blacklist in production
    // For now, just acknowledge the logout on client side

    logger.info(`User logged out: ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Logout successful',
    });
  })
);

/**
 * GET /api/v1/auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await authService.findUserById(req.user!.id);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      user: user.toJSON(),
    });
  })
);

/**
 * POST /api/v1/auth/forgot-password
 * Request password reset
 */
router.post(
  '/forgot-password',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
    }

    const user = await authService.findUserByEmail(email);

    // Don't reveal if user exists (security best practice)
    if (user) {
      // TODO: Implement password reset email logic
      logger.info(`Password reset requested for: ${email}`);
    }

    res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent',
    });
  })
);

/**
 * PUT /api/v1/auth/profile
 * Update user profile
 */
router.put(
  '/profile',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { firstName, lastName, phone, bio, profilePhotoUrl } = req.body;
    const userId = req.user!.id;

    const user = await authService.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (bio !== undefined) user.bio = bio;
    if (profilePhotoUrl !== undefined) user.profilePhotoUrl = profilePhotoUrl;

    await userRepository.save(user);

    logger.info(`User profile updated: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toJSON(),
    });
  })
);

/**
 * PUT /api/v1/auth/change-password
 * Change user password
 */
router.put(
  '/change-password',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current and new passwords are required', 400, 'VALIDATION_ERROR');
    }

    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters long', 400, 'WEAK_PASSWORD');
    }

    const user = await authService.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Validate current password
    const isPasswordValid = await user.validatePassword(currentPassword);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');
    }

    // Update password
    user.passwordHash = newPassword;
    await userRepository.save(user);

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  })
);

export default router;
