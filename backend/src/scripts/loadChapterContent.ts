/**
 * Chapter content loader.
 *
 * Reads Chapter_{N}_KDP_Ebook.docx files from a source directory,
 * converts them to HTML via mammoth (extracting embedded images to
 * `frontend/public/content/chapters/ch{N}/`), and upserts the HTML
 * into Chapter.content keyed by chapterNumber.
 *
 * Usage:
 *   npm run content:load                      # load all 13 chapters
 *   npm run content:load -- --dry-run         # parse + extract images, skip DB
 *   npm run content:load -- --chapter 1       # only chapter 1
 *   npm run content:load -- --chapter 1 --chapter 2
 *   npm run content:load -- --source /path/to/docx --image-dir /path/to/images
 *
 * Matches chapters by chapterNumber (unique), so re-runs are idempotent —
 * existing chapter rows keep their UUIDs and any related progress rows
 * continue to work.
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import mammoth from 'mammoth';
import { Client as PgClient } from 'pg';
import dotenv from 'dotenv';

// Load .env from backend/.env (same pattern as src/config/database.ts)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Note: we deliberately avoid importing AppDataSource / entity models here
// because importing Chapter transitively pulls in User → bcrypt, and the
// bcrypt native binary is platform-fragile on this machine. The loader
// only needs to run a single UPDATE, so a raw pg Client is the simplest
// reliable path. The connection config mirrors backend/src/config/database.ts.

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface Args {
  source: string;
  imageDir: string;
  publicPrefix: string;
  chapters: number[]; // empty = all
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const scriptDir = __dirname;
  // backend/src/scripts → go up 3 → delaware-valley-drones-lms → up 1 → parent
  const repoRoot = path.resolve(scriptDir, '../../..');
  const parentOfRepo = path.resolve(repoRoot, '..');

  const defaults: Args = {
    source: path.join(parentOfRepo, 'Part 107 Certification Course'),
    imageDir: path.join(repoRoot, 'frontend/public/content/chapters'),
    publicPrefix: '/content/chapters',
    chapters: [],
    dryRun: false,
  };

  const args = { ...defaults };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    const next = rest[i + 1];
    switch (flag) {
      case '--source':
        args.source = path.resolve(next);
        i++;
        break;
      case '--image-dir':
        args.imageDir = path.resolve(next);
        i++;
        break;
      case '--public-prefix':
        args.publicPrefix = next;
        i++;
        break;
      case '--chapter': {
        const n = parseInt(next, 10);
        if (Number.isNaN(n) || n < 1 || n > 13) {
          throw new Error(`--chapter must be an integer 1..13, got "${next}"`);
        }
        args.chapters.push(n);
        i++;
        break;
      }
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown flag: ${flag}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Chapter content loader

Flags:
  --source <path>         Directory containing Chapter_N_KDP_Ebook.docx files
  --image-dir <path>      Where to extract embedded images
  --public-prefix <url>   URL prefix for <img> tags (default: /content/chapters)
  --chapter <N>           Only process chapter N (repeatable)
  --dry-run               Parse + extract images but do not touch the DB
  --help, -h              Print this message
`);
}

// ---------------------------------------------------------------------------
// Content extraction
// ---------------------------------------------------------------------------

interface ExtractResult {
  html: string;
  imageCount: number;
  warnings: string[];
}

const EXT_FOR_CONTENT_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

async function extractChapter(
  docxPath: string,
  chapterNumber: number,
  imageDirRoot: string,
  publicPrefix: string
): Promise<ExtractResult> {
  // Wipe and recreate per-chapter image directory so re-runs don't leak stale files.
  const chapterImageDir = path.join(imageDirRoot, `ch${chapterNumber}`);
  if (fs.existsSync(chapterImageDir)) {
    fs.rmSync(chapterImageDir, { recursive: true, force: true });
  }
  fs.mkdirSync(chapterImageDir, { recursive: true });

  let imageCount = 0;

  const result = await mammoth.convertToHtml(
    { path: docxPath },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const buffer = await image.read();
        const ext = EXT_FOR_CONTENT_TYPE[image.contentType] || 'bin';
        const hash = crypto
          .createHash('sha256')
          .update(buffer)
          .digest('hex')
          .slice(0, 12);
        const filename = `image-${hash}.${ext}`;
        const outPath = path.join(chapterImageDir, filename);
        // Only write if not already present (same hash = same bytes).
        if (!fs.existsSync(outPath)) {
          fs.writeFileSync(outPath, buffer);
        }
        imageCount++;
        return {
          src: `${publicPrefix}/ch${chapterNumber}/${filename}`,
          alt: `Chapter ${chapterNumber} figure`,
        };
      }),
    }
  );

  const warnings = result.messages
    .filter((m) => m.type === 'warning' || m.type === 'error')
    .map((m) => m.message);

  const html = postProcessHtml(result.value);

  return { html, imageCount, warnings };
}

/**
 * Light cleanup on mammoth's output. The source docx uses bold text for
 * headings instead of real heading styles, so we lift common patterns to
 * real <h1>/<h2>/<h3> tags. Everything else is left alone.
 */
function postProcessHtml(html: string): string {
  let out = html;

  // Collapse runs of empty paragraphs (mammoth emits them around images)
  out = out.replace(/(<p>\s*<\/p>\s*){2,}/g, '<p></p>');

  // "<p><strong>Chapter N</strong></p>" → <h1> (top-of-chapter banner)
  out = out.replace(
    /<p><strong>(Chapter \d+)<\/strong><\/p>/g,
    '<h1>$1</h1>'
  );

  // "<p><strong>N.M Title</strong></p>" → <h2> (numbered section)
  out = out.replace(
    /<p><strong>(\d+\.\d+\s+[^<]+?)<\/strong><\/p>/g,
    '<h2>$1</h2>'
  );

  // "<p><strong>Short Title</strong></p>" (≤ 60 chars, no period) → <h3>
  // Catches "Chapter Overview", "Learning Objectives", "Definition and
  // Importance", etc. without grabbing normal bold-phrase emphasis in
  // the middle of paragraphs.
  out = out.replace(
    /<p><strong>([^<.]{1,60})<\/strong><\/p>/g,
    '<h3>$1</h3>'
  );

  out = out.trim();
  return `<div class="chapter-content">${out}</div>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// DB connection — mirrors backend/src/config/database.ts logic
// ---------------------------------------------------------------------------

function buildPgClient(): PgClient {
  const databaseUrl = process.env.DATABASE_URL;
  const caCert = process.env.DATABASE_CA_CERT || process.env.CA_CERT;
  const isProduction = process.env.NODE_ENV === 'production';

  const sslConfig = caCert
    ? { ca: caCert, rejectUnauthorized: true }
    : isProduction || databaseUrl
    ? { rejectUnauthorized: false }
    : undefined;

  if (databaseUrl) {
    // Parse manually (don't pass URL to the client) so our ssl config
    // takes effect against DO's self-signed cert chain. Same reasoning
    // as in src/config/database.ts.
    const parsed = new URL(databaseUrl);
    return new PgClient({
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432', 10),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
      ssl: sslConfig,
    });
  }

  return new PgClient({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'delaware_valley_drones',
    ssl: sslConfig,
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);

  console.log('Chapter Content Loader');
  console.log('  source:       ', args.source);
  console.log('  image-dir:    ', args.imageDir);
  console.log('  public-prefix:', args.publicPrefix);
  console.log('  chapters:     ', args.chapters.length ? args.chapters.join(',') : 'all (1-13)');
  console.log('  dry-run:      ', args.dryRun);
  console.log('');

  if (!fs.existsSync(args.source)) {
    console.error(`ERROR: source directory does not exist: ${args.source}`);
    process.exit(1);
  }
  fs.mkdirSync(args.imageDir, { recursive: true });

  // Connect to DB (skip for dry-run so you can iterate without it)
  let client: PgClient | null = null;
  if (!args.dryRun) {
    console.log('Connecting to database...');
    client = buildPgClient();
    await client.connect();
    console.log('  connected.\n');
  }

  const targetChapters = args.chapters.length
    ? args.chapters
    : Array.from({ length: 13 }, (_, i) => i + 1);

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const n of targetChapters) {
    const docxName = `Chapter_${n}_KDP_Ebook.docx`;
    const docxPath = path.join(args.source, docxName);

    if (!fs.existsSync(docxPath)) {
      console.warn(`  ⚠  skip  ch${n}: ${docxName} not found`);
      skipped++;
      continue;
    }

    try {
      const { html, imageCount, warnings } = await extractChapter(
        docxPath,
        n,
        args.imageDir,
        args.publicPrefix
      );

      if (warnings.length) {
        console.warn(`  ⚠  ch${n}: ${warnings.length} mammoth warning(s)`);
        warnings.slice(0, 3).forEach((w) => console.warn(`        ${w}`));
        if (warnings.length > 3) {
          console.warn(`        ...and ${warnings.length - 3} more`);
        }
      }

      if (args.dryRun) {
        console.log(
          `  ✓ dry ch${n}: ${html.length.toLocaleString()} bytes, ${imageCount} images`
        );
        succeeded++;
        continue;
      }

      const result = await client!.query(
        `UPDATE chapters
           SET content = $1,
               "isPublished" = true,
               "updatedAt" = NOW()
         WHERE "chapterNumber" = $2
         RETURNING id`,
        [html, n]
      );

      if (result.rowCount === 0) {
        console.error(`  ✗ fail ch${n}: no row with chapterNumber=${n}`);
        failed++;
        continue;
      }

      const chapterId = result.rows[0].id as string;
      console.log(
        `  ✓ save ch${n}: ${html.length.toLocaleString()} bytes, ${imageCount} images → chapter ${chapterId}`
      );
      succeeded++;
    } catch (err) {
      console.error(`  ✗ fail ch${n}:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log('');
  console.log(`Done. succeeded=${succeeded} failed=${failed} skipped=${skipped}`);

  if (client) {
    await client.end();
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
