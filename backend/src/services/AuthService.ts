import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AppDataSource } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Generate JWT access token
   */
  generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('JWT secret not configured', 500, 'CONFIG_ERROR');
    }

    const expiresIn = process.env.JWT_EXPIRATION || '24h';

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) {
      throw new AppError('Refresh token secret not configured', 500, 'CONFIG_ERROR');
    }

    const expiresIn = process.env.REFRESH_TOKEN_EXPIRATION || '30d';

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Generate both tokens
   */
  generateTokens(user: User): AuthTokens {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    const expiresIn = process.env.JWT_EXPIRATION || '24h';

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify refresh token and issue new access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const secret = process.env.REFRESH_TOKEN_SECRET;
      if (!secret) {
        throw new AppError('Refresh token secret not configured', 500, 'CONFIG_ERROR');
      }

      const payload = jwt.verify(refreshToken, secret) as TokenPayload;

      // Fetch user from database
      const user = await this.userRepository.findOne({ where: { id: payload.userId } });
      if (!user) {
        throw new AppError('User not found', 401, 'USER_NOT_FOUND');
      }

      // Generate new tokens
      return this.generateTokens(user);
    } catch (error: any) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
      }
      throw error;
    }
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new AppError('JWT secret not configured', 500, 'CONFIG_ERROR');
      }

      return jwt.verify(token, secret) as TokenPayload;
    } catch (error: any) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
      }
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * Create new user
   */
  async createUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: string = 'student'
  ): Promise<User> {
    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // Create new user
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      firstName,
      lastName,
      passwordHash: password,
      role,
      emailVerified: false,
      isActive: true,
      isBlocked: false,
    });

    // Save user (password will be hashed by BeforeInsert hook)
    return this.userRepository.save(user);
  }

  /**
   * Validate user credentials
   */
  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('User account is inactive', 403, 'ACCOUNT_INACTIVE');
    }

    if (user.isBlocked) {
      throw new AppError('User account is blocked', 403, 'ACCOUNT_BLOCKED');
    }

    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    return user;
  }

  /**
   * Update user last login time
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      lastLoginAt: new Date(),
    });
  }
}

export const authService = new AuthService();
