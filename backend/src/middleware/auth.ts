import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
}

/**
 * Verify JWT access token
 */
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No authorization token provided', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name || '',
    };

    next();
  } catch (error) {
    next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
};

/**
 * Optional auth - attaches user if token present, continues if not
 */
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name || '',
      };
    }

    next();
  } catch (error) {
    next(); // Silently ignore auth errors for optional auth
  }
};

/**
 * Require a specific role or array of roles
 * Accepts both a single string role and an array of roles
 * e.g. requireRole('admin') or requireRole(['admin', 'instructor'])
 */
export const requireRole = (roles: string | string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }

    next();
  };
};
