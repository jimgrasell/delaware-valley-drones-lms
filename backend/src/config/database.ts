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

// DO managed Postgres requires TLS but uses an internal CA that isn't in
// Node's default trust store, so we accept the self-signed chain. If
// CA_CERT is provided (e.g. the CA downloaded from the DO dashboard), we
// pin against it and require verification.
const caCert = process.env.DATABASE_CA_CERT || process.env.CA_CERT;
const sslConfig = caCert
  ? { ca: caCert, rejectUnauthorized: true }
  : isProduction || databaseUrl
  ? { rejectUnauthorized: false }
  : false;

// Parse DATABASE_URL ourselves into discrete fields rather than passing the
// url string to the driver. Recent versions of `pg-connection-string` (used
// by node-postgres) upgrade `sslmode=require` to `verify-full`, which
// overrides our `ssl` config and fails with "self-signed certificate in
// certificate chain" against DO Postgres. Passing host/user/etc. directly
// means our ssl config is the one that takes effect.
function parseDatabaseUrl(urlString: string) {
  const parsed = new URL(urlString);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '5432'),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
  };
}

const connectionOptions = databaseUrl
  ? parseDatabaseUrl(databaseUrl)
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'delaware_valley_drones',
    };

// Schema auto-creation. On by default in development. In production it is
// off unless DB_SYNCHRONIZE=true is set explicitly — used to bootstrap the
// schema on first deploy (set the env var once, deploy, then unset it).
// Never leave this on permanently in production: TypeORM will try to
// reconcile the live schema against the entity models on every startup and
// can drop or alter columns.
const shouldSynchronize =
  process.env.DB_SYNCHRONIZE === 'true' ||
  process.env.NODE_ENV === 'development';

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...connectionOptions,
  synchronize: shouldSynchronize,
  logging: process.env.NODE_ENV === 'development',
  entities,
  migrations: [migrationsPath],
  subscribers: [subscribersPath],
  ssl: sslConfig,
});
