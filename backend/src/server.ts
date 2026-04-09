import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import { AppDataSource } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

const app: Express = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// Middleware
// ============================================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// ============================================
// Health check endpoint
// ============================================
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// API Routes (to be implemented)
// ============================================
app.use('/api/v1/auth', require('./routes/auth').default);
app.use('/api/v1/students', authMiddleware, require('./routes/students').default);
app.use('/api/v1/chapters', require('./routes/chapters').default);
app.use('/api/v1/quizzes', require('./routes/quizzes').default);
app.use('/api/v1/forum', require('./routes/forum').default);
app.use('/api/v1/payments', require('./routes/payments').default);
app.use('/api/v1/certificates', require('./routes/certificates').default);
app.use('/api/v1/admin', authMiddleware, require('./routes/admin').default);

// ============================================
// Error handling
// ============================================
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.path} not found`,
    status: 404,
  });
});

app.use(errorHandler);

// ============================================
// Database initialization and server startup
// ============================================
async function startServer() {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('✅ Database connection established');
    }

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📝 Environment: ${NODE_ENV}`);
      logger.info(`🔐 CORS Origins: ${corsOrigins.join(', ')}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info('Database connection closed');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info('Database connection closed');
  }
  process.exit(0);
});

// Start the server
startServer();

export default app;
