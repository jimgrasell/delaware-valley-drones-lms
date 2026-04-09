import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino();

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

export class AppError extends Error implements ApiError {
  status: number;
  code: string;

  constructor(message: string, status: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const error = err instanceof AppError ? err : new AppError(err.message || 'Internal Server Error', 500);

  logger.error({
    message: error.message,
    status: error.status,
    code: error.code,
    path: req.path,
    method: req.method,
    stack: error.stack,
  });

  res.status(error.status || 500).json({
    error: error.code || 'INTERNAL_ERROR',
    message: error.message,
    status: error.status || 500,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

// Async error wrapper
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
