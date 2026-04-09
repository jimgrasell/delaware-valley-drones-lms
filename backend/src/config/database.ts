import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import entities
import { User } from '../models/User';
import { Enrollment } from '../models/Enrollment';
import { Chapter } from '../models/Chapter';
import { Quiz } from '../models/Quiz';
import { Question } from '../models/Question';
import { QuestionOption } from '../models/QuestionOption';
import { ChapterProgress } from '../models/ChapterProgress';
import { QuizAttempt } from '../models/QuizAttempt';
import { QuizAnswer } from '../models/QuizAnswer';
import { Payment } from '../models/Payment';
import { Coupon } from '../models/Coupon';
import { Announcement } from '../models/Announcement';
import { ForumPost } from '../models/ForumPost';
import { ForumReply } from '../models/ForumReply';
import { Certificate } from '../models/Certificate';

const entities = [
  User,
  Enrollment,
  Chapter,
  Quiz,
  Question,
  QuestionOption,
  ChapterProgress,
  QuizAttempt,
  QuizAnswer,
  Payment,
  Coupon,
  Announcement,
  ForumPost,
  ForumReply,
  Certificate,
];

const migrationsPath = path.join(__dirname, '../migrations/*.ts');
const subscribersPath = path.join(__dirname, '../subscribers/*.ts');

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'delaware_valley_drones',
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities,
  migrations: [migrationsPath],
  subscribers: [subscribersPath],
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
