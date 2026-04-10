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

// Pick up compiled .js files in production (after `tsc`) and .ts files when
// running locally via ts-node / ts-node-dev.
const fileExt = __filename.endsWith('.ts') ? 'ts' : 'js';
const migrationsPath = path.join(__dirname, `../migrations/*.${fileExt}`);
const subscribersPath = path.join(__dirname, `../subscribers/*.${fileExt}`);

const isProduction = process.env.NODE_ENV === 'production';

// DigitalOcean App Platform (and most managed Postgres providers) injects a
// single DATABASE_URL connection string when you bind a database to a
// component. Prefer it when present and fall back to discrete DB_* vars so
// local development keeps working.
const databaseUrl = process.env.DATABASE_URL;

// DO managed Postgres requires TLS. Allow self-signed certs — DO's cert
// chain isn't in Node's default trust store unless CA_CERT is provided.
const sslConfig =
  isProduction || databaseUrl ? { rejectUnauthorized: false } : false;

const baseOptions = {
  type: 'postgres' as const,
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities,
  migrations: [migrationsPath],
  subscribers: [subscribersPath],
  ssl: sslConfig,
};

export const AppDataSource = new DataSource(
  databaseUrl
    ? {
        ...baseOptions,
        url: databaseUrl,
      }
    : {
        ...baseOptions,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'delaware_valley_drones',
      }
);
