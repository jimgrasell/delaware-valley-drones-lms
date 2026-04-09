import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique certificate verification ID
 */
export const generateVerificationId = (): string => {
  return `CERT-${uuidv4().substring(0, 12).toUpperCase()}`;
};

/**
 * Parse JWT token without verification (for debugging)
 */
export const parseToken = (token: string): any => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (error) {
    return null;
  }
};

/**
 * Format course progress as percentage
 */
export const formatProgress = (completedChapters: number, totalChapters: number): number => {
  if (totalChapters === 0) return 0;
  return Math.round((completedChapters / totalChapters) * 100);
};

/**
 * Calculate quiz score
 */
export const calculateQuizScore = (correctAnswers: number, totalQuestions: number): number => {
  if (totalQuestions === 0) return 0;
  return Math.round((correctAnswers / totalQuestions) * 100);
};

/**
 * Check if quiz is passed based on passing score
 */
export const isQuizPassed = (score: number, passingScore: number): boolean => {
  return score >= passingScore;
};

/**
 * Format date for API responses
 */
export const formatDate = (date: Date): string => {
  return date.toISOString();
};

/**
 * Generate random alphanumeric string
 */
export const generateRandomString = (length: number = 16): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
