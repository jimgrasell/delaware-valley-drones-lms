/**
 * Quiz question loader.
 *
 * Reads Part_107_Practice_Questions_Bank.txt, parses the 142 questions,
 * and distributes them across the 14 chapter quizzes by topic area.
 *
 * Usage:
 *   npm run quiz:load                    # load all questions
 *   npm run quiz:load -- --dry-run       # parse only, print distribution, skip DB
 *   npm run quiz:load -- --source /path/to/file.txt
 *
 * For each quiz, existing questions + options are DELETE'd and replaced.
 * Quiz metadata (title, passingScore, etc.) is left untouched.
 */

import path from 'path';
import fs from 'fs';
import { Client as PgClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedOption {
  text: string;
  isCorrect: boolean;
  order: number;
}

interface ParsedQuestion {
  number: number;
  title: string;
  acsCode: string;
  questionText: string;
  options: ParsedOption[];
  explanation: string;
  area: number; // 1-5 (roman numeral area from the bank)
}

// ---------------------------------------------------------------------------
// Area → Chapter mapping
// ---------------------------------------------------------------------------

// Maps the 5 FAA knowledge areas to the chapters whose content actually
// covers that area. Questions distribute round-robin within each area's
// target chapters.
//
// Chapter titles (post-AddChapter6AndShift migration, Apr 14):
//   1. Welcome to the Part 107 Certification Journey  (intro)
//   2. Aviation Fundamentals for Drone Pilots         (aerodynamics)
//   3. Part 107 Regulations - General Rules
//   4. Part 107 Regulations - Operations & Waivers
//   5. Airspace Classification and Structure
//   6. Reading and Understanding Sectional Charts     ← NEW
//   7. Airspace Operations and Restrictions
//   8. Aviation Weather Sources and Interpretation
//   9. Weather Effects on sUAS Performance
//   10. Weight, Balance, and Aircraft Performance
//   11. Radio Communications and Airport Operations
//   12. Emergency Procedures and Risk Management
//   13. Physiological Factors and Aircraft Maintenance
//   14. Practice Exam 1                               (mixed)
const AREA_TO_CHAPTERS: Record<number, number[]> = {
  1: [3, 4],         // Regulations → General Rules, Operations & Waivers
  2: [5, 6, 7],      // Airspace → Classification, Sectional Charts, Operations
  3: [8, 9],         // Weather → Sources & Interpretation, Effects on sUAS
  4: [2, 10],        // Loading/Performance → Aviation Fundamentals, Weight & Balance
  5: [11, 12, 13],   // Operations → Radio/Airport, Emergency, Physio & Maintenance
};

// Ch1 (intro) and Ch14 (Practice Exam 1) pull mixed questions from
// every area. Ch1 gets a handful of orientation-level questions; Ch14
// gets a balanced cross-section to simulate the real FAA exam.
const MIXED_CHAPTERS = [1, 14];
const MIXED_QUESTIONS_PER_CHAPTER = 5;

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseQuestionBank(filePath: string): ParsedQuestion[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');

  const questions: ParsedQuestion[] = [];
  let currentArea = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect area headers: "AREA I:", "AREA II:", etc.
    const areaMatch = line.match(/^AREA\s+(I{1,3}|IV|V)\s*:/);
    if (areaMatch) {
      currentArea = romanToInt(areaMatch[1]);
      i++;
      continue;
    }

    // Detect question start: "Q123. Title Here"
    const qMatch = line.match(/^Q(\d+)\.\s+(.+)/);
    if (qMatch && currentArea > 0) {
      const qNum = parseInt(qMatch[1], 10);
      const title = qMatch[2].trim();

      i++;
      // ACS Code line
      let acsCode = '';
      if (i < lines.length && lines[i].startsWith('ACS Code:')) {
        acsCode = lines[i].replace('ACS Code:', '').trim();
        i++;
      }

      // Question text: everything until we hit an option line (A), B), C))
      const questionLines: string[] = [];
      while (i < lines.length && !isOptionLine(lines[i])) {
        questionLines.push(lines[i]);
        i++;
      }
      const questionText = questionLines.join(' ').trim();

      // Options (A, B, C)
      const options: ParsedOption[] = [];
      let optionOrder = 0;
      while (i < lines.length && (isOptionLine(lines[i]) || isContinuationLine(lines[i], options.length > 0))) {
        const optMatch = lines[i].match(/^([A-C])\)\s*(.*)/);
        if (optMatch) {
          const rawText = optMatch[2];
          const isCorrect = rawText.includes('[CORRECT]') || rawText.includes('[[CORRECT]');
          const cleanText = rawText
            .replace(/\[+CORRECT\]\s*/g, '')
            .trim();

          options.push({
            text: cleanText,
            isCorrect,
            order: optionOrder++,
          });
          i++;

          // Continuation lines (indented, part of the same option)
          while (i < lines.length && /^\s{2,}/.test(lines[i]) && !isOptionLine(lines[i]) && !lines[i].startsWith('EXPLANATION:')) {
            const contText = lines[i].trim();
            const contCorrect = contText.includes('[CORRECT]') || contText.includes('[[CORRECT]');
            options[options.length - 1].text += ' ' + contText.replace(/\[+CORRECT\]\s*/g, '').trim();
            if (contCorrect) options[options.length - 1].isCorrect = true;
            i++;
          }
        } else {
          i++;
        }
      }

      // Explanation: everything after "EXPLANATION:" until "---"
      const explanationLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith('---') && !lines[i].startsWith('===')) {
        const expMatch = lines[i].match(/^EXPLANATION:\s*(.*)/);
        if (expMatch) {
          explanationLines.push(expMatch[1]);
        } else if (explanationLines.length > 0 && lines[i].trim()) {
          explanationLines.push(lines[i].trim());
        }
        i++;
      }

      questions.push({
        number: qNum,
        title,
        acsCode,
        questionText,
        options,
        explanation: explanationLines.join(' ').trim(),
        area: currentArea,
      });

      continue;
    }

    i++;
  }

  return questions;
}

function isOptionLine(line: string): boolean {
  return /^[A-C]\)\s/.test(line);
}

function isContinuationLine(line: string, hasOptions: boolean): boolean {
  return hasOptions && /^\s{2,}/.test(line);
}

function romanToInt(roman: string): number {
  const map: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
  return map[roman] || 0;
}

// ---------------------------------------------------------------------------
// Distribution
// ---------------------------------------------------------------------------

interface ChapterAssignment {
  chapterNumber: number;
  questions: ParsedQuestion[];
}

function distributeQuestions(questions: ParsedQuestion[]): ChapterAssignment[] {
  // Group questions by area
  const byArea = new Map<number, ParsedQuestion[]>();
  for (const q of questions) {
    const list = byArea.get(q.area) || [];
    list.push(q);
    byArea.set(q.area, list);
  }

  // Initialize assignments for all 14 chapters
  const assignments = new Map<number, ParsedQuestion[]>();
  for (let ch = 1; ch <= 14; ch++) {
    assignments.set(ch, []);
  }

  // For each area, reserve some for mixed chapters, then round-robin the rest
  for (const [area, areaQuestions] of byArea) {
    const targetChapters = AREA_TO_CHAPTERS[area];
    if (!targetChapters) continue;

    // Pull a few from the end for Ch12/Ch13
    const mixedCount = Math.min(
      MIXED_QUESTIONS_PER_CHAPTER,
      Math.floor(areaQuestions.length * 0.15) // at most 15% go to mixed
    );
    const mixedPool = areaQuestions.splice(-mixedCount);

    // Distribute mixed pool across Ch12 and Ch13
    for (let i = 0; i < mixedPool.length; i++) {
      const ch = MIXED_CHAPTERS[i % MIXED_CHAPTERS.length];
      assignments.get(ch)!.push(mixedPool[i]);
    }

    // Round-robin the rest across target chapters
    for (let i = 0; i < areaQuestions.length; i++) {
      const ch = targetChapters[i % targetChapters.length];
      assignments.get(ch)!.push(areaQuestions[i]);
    }
  }

  return Array.from(assignments.entries())
    .sort(([a], [b]) => a - b)
    .map(([chapterNumber, qs]) => ({ chapterNumber, questions: qs }));
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface Args {
  source: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const scriptDir = __dirname;
  const repoRoot = path.resolve(scriptDir, '../../..');
  const parentOfRepo = path.resolve(repoRoot, '..');

  const defaults: Args = {
    source: path.join(parentOfRepo, 'Part 107 Certification Course', 'Part_107_Practice_Questions_Bank.txt'),
    dryRun: false,
  };

  const args = { ...defaults };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    switch (rest[i]) {
      case '--source':
        args.source = path.resolve(rest[++i]);
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--help':
      case '-h':
        console.log('Usage: npm run quiz:load [--dry-run] [--source <path>]');
        process.exit(0);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// DB connection (same pattern as loadChapterContent.ts)
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

  console.log('Quiz Question Loader');
  console.log('  source: ', args.source);
  console.log('  dry-run:', args.dryRun);
  console.log('');

  if (!fs.existsSync(args.source)) {
    console.error(`ERROR: source file not found: ${args.source}`);
    process.exit(1);
  }

  // Parse
  console.log('Parsing question bank...');
  const questions = parseQuestionBank(args.source);
  console.log(`  parsed ${questions.length} questions across ${new Set(questions.map(q => q.area)).size} areas`);

  // Validate
  let warnings = 0;
  for (const q of questions) {
    if (q.options.length < 2) {
      console.warn(`  ⚠ Q${q.number}: only ${q.options.length} options`);
      warnings++;
    }
    const correctCount = q.options.filter(o => o.isCorrect).length;
    if (correctCount !== 1) {
      console.warn(`  ⚠ Q${q.number}: ${correctCount} correct answers (expected 1)`);
      warnings++;
    }
  }
  if (warnings) console.warn(`  ${warnings} warning(s)\n`);

  // Distribute
  const assignments = distributeQuestions(questions);
  console.log('\nDistribution:');
  for (const a of assignments) {
    console.log(`  ch${String(a.chapterNumber).padStart(2)}: ${a.questions.length} questions`);
  }
  console.log('');

  if (args.dryRun) {
    // Print a sample question
    const sample = questions[0];
    console.log('Sample parsed question:');
    console.log(`  Q${sample.number}: ${sample.title}`);
    console.log(`  ACS: ${sample.acsCode}`);
    console.log(`  Text: ${sample.questionText.slice(0, 80)}...`);
    console.log(`  Options: ${sample.options.map(o => `${o.isCorrect ? '✓' : ' '} ${o.text.slice(0, 50)}`).join(' | ')}`);
    console.log(`  Explanation: ${sample.explanation.slice(0, 80)}...`);
    console.log('\nDry run complete — no DB changes.');
    process.exit(0);
  }

  // Connect
  console.log('Connecting to database...');
  const client = buildPgClient();
  await client.connect();
  console.log('  connected.\n');

  let succeeded = 0;
  let failed = 0;

  for (const assignment of assignments) {
    const { chapterNumber, questions: chQuestions } = assignment;
    if (chQuestions.length === 0) continue;

    try {
      // Find the quiz for this chapter
      const quizResult = await client.query(
        `SELECT q.id FROM quizzes q
           JOIN chapters c ON q."chapterId" = c.id
          WHERE c."chapterNumber" = $1
          LIMIT 1`,
        [chapterNumber]
      );

      if (quizResult.rows.length === 0) {
        console.warn(`  ⚠ skip ch${chapterNumber}: no quiz found`);
        continue;
      }

      const quizId = quizResult.rows[0].id as string;

      // Delete existing questions + their options (CASCADE should handle options,
      // but we explicitly delete to be safe with any FK config)
      await client.query(
        `DELETE FROM question_options WHERE "questionId" IN (
           SELECT id FROM questions WHERE "quizId" = $1
         )`,
        [quizId]
      );
      await client.query(`DELETE FROM questions WHERE "quizId" = $1`, [quizId]);

      // Insert new questions + options
      for (let qi = 0; qi < chQuestions.length; qi++) {
        const q = chQuestions[qi];

        const qInsert = await client.query(
          `INSERT INTO questions ("quizId", "questionText", type, explanation, points, "order")
           VALUES ($1, $2, 'multiple_choice', $3, 1, $4)
           RETURNING id`,
          [quizId, q.questionText, q.explanation, qi]
        );
        const questionId = qInsert.rows[0].id as string;

        for (const opt of q.options) {
          await client.query(
            `INSERT INTO question_options ("questionId", "optionText", "isCorrect", "order")
             VALUES ($1, $2, $3, $4)`,
            [questionId, opt.text, opt.isCorrect, opt.order]
          );
        }
      }

      // Update quiz totalQuestions
      await client.query(
        `UPDATE quizzes SET "totalQuestions" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [chQuestions.length, quizId]
      );

      console.log(`  ✓ ch${String(chapterNumber).padStart(2)}: ${chQuestions.length} questions → quiz ${quizId}`);
      succeeded++;
    } catch (err) {
      console.error(`  ✗ ch${chapterNumber}:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nDone. succeeded=${succeeded} failed=${failed}`);
  await client.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
