import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Curriculum restructure (Apr 14, 2026):
 * The instructor inserted a new chapter 6 ("Reading and Understanding
 * Sectional Charts") between the existing chapters 5 and 6. Old
 * chapters 6–13 shift down by one position. There are now 13 content
 * chapters (1–13) and 1 practice-exam chapter (14).
 *
 * What this migration does:
 *   1. Renumber existing chapters 6–13 to 7–14 (in reverse order to
 *      avoid unique-index conflicts on chapterNumber).
 *   2. Insert a new chapter 6 row with a placeholder content body —
 *      the loader will populate the actual content.
 *   3. Insert a corresponding empty quiz for the new chapter 6 so the
 *      quiz-question loader has a row to write into.
 *   4. Update every chapter's title + description to match the
 *      headings in the current Chapter_N_KDP_Ebook.docx files.
 *   5. Update quiz titles ("Chapter N Quiz") so the number matches
 *      the chapter's new position.
 *
 * Existing student progress and quiz attempts are preserved because
 * UUIDs don't change — only chapterNumber values shift.
 */
export class AddChapter6AndShift1776300000000 implements MigrationInterface {
  name = 'AddChapter6AndShift1776300000000';

  // Fresh UUIDs for the new chapter 6 + its quiz. Hex-only so they're
  // valid UUIDs but visually distinct from the original deterministic
  // 100…00N / 200…00N pattern.
  private readonly NEW_CH6_ID = '10000000-0000-0000-0000-0000000000a6';
  private readonly NEW_QUIZ6_ID = '20000000-0000-0000-0000-0000000000a6';

  // Final titles + descriptions for all 14 chapters, taken verbatim
  // from the docx headings.
  private readonly chapters: Array<{ n: number; title: string; description: string }> = [
    {
      n: 1,
      title: 'Welcome to the Part 107 Certification Journey',
      description: 'Understanding Your Path to FAA Remote Pilot Certification',
    },
    {
      n: 2,
      title: 'Aviation Fundamentals for Drone Pilots',
      description: 'Understanding Aerodynamics, Flight Characteristics, and Aircraft Control',
    },
    {
      n: 3,
      title: 'Part 107 Regulations - General Rules',
      description: 'Understanding the Legal Framework for Commercial Drone Operations',
    },
    {
      n: 4,
      title: 'Part 107 Regulations - Operations & Waivers',
      description: 'Operational Requirements, Night Ops, Remote ID, and the Waiver Process',
    },
    {
      n: 5,
      title: 'Airspace Classification and Structure',
      description: 'Mastering the Six Airspace Classes',
    },
    {
      n: 6,
      title: 'Reading and Understanding Sectional Charts',
      description: 'Decoding the VFR Sectional for Safe sUAS Flight Planning',
    },
    {
      n: 7,
      title: 'Airspace Operations and Restrictions',
      description: 'Operating Requirements, ATC Communication, NOTAMs, TFRs, and Special Use Airspace',
    },
    {
      n: 8,
      title: 'Aviation Weather Sources and Interpretation',
      description: 'METARs, TAFs, Aviation Forecasts, and Weather Decision-Making',
    },
    {
      n: 9,
      title: 'Weather Effects on sUAS Performance',
      description: 'Density Altitude, Wind Effects, Temperature, and Severe Weather',
    },
    {
      n: 10,
      title: 'Weight, Balance, and Aircraft Performance',
      description: 'Center of Gravity, Payload Planning, and Mission Optimization',
    },
    {
      n: 11,
      title: 'Radio Communications and Airport Operations',
      description: 'Aviation Radio, Traffic Patterns, Runway Designations, and Light Signals',
    },
    {
      n: 12,
      title: 'Emergency Procedures and Risk Management',
      description: 'Decision-Making, Crew Resource Management, and Accident Prevention',
    },
    {
      n: 13,
      title: 'Physiological Factors and Aircraft Maintenance',
      description: 'Fitness to Fly, Battery Care, Preflight Inspection, and Maintenance',
    },
    {
      n: 14,
      title: 'Practice Exam 1',
      description: '60-Question Full-Length Practice Assessment',
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: shift existing chapters 6 -> 7 ... 13 -> 14, in reverse
    // so the unique index on chapterNumber never sees a duplicate.
    for (let n = 13; n >= 6; n--) {
      await queryRunner.query(
        `UPDATE chapters SET "chapterNumber" = $1 WHERE "chapterNumber" = $2`,
        [n + 1, n]
      );
    }

    // Step 2: insert new chapter 6. content is a placeholder; the
    // chapter content loader will fill it in from the docx.
    await queryRunner.query(
      `INSERT INTO chapters
        (id, "chapterNumber", title, description, content, "isPublished",
         "videoDurationSeconds", "order", "createdAt", "updatedAt")
       VALUES ($1, 6, $2, $3, $4, true, 0, 6, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        this.NEW_CH6_ID,
        'Reading and Understanding Sectional Charts',
        'Decoding the VFR Sectional for Safe sUAS Flight Planning',
        '<p>Chapter content loading. Run npm run content:load to populate.</p>',
      ]
    );

    // Step 3: insert empty quiz for new chapter 6 so the quiz loader
    // has a row to populate. passingScore=70 to match the post-fix
    // default; timeLimit=30 mirrors the seed.
    await queryRunner.query(
      `INSERT INTO quizzes
        (id, "chapterId", title, description, "totalQuestions",
         "passingScore", "timeLimit", "allowRetakes", "maxRetakes",
         "shuffleQuestions", "showCorrectAnswers", "order",
         "createdAt", "updatedAt")
       VALUES ($1, $2, 'Chapter 6 Quiz',
               'Test your knowledge of Reading and Understanding Sectional Charts',
               0, 70, 30, true, 3, true, true, 0, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [this.NEW_QUIZ6_ID, this.NEW_CH6_ID]
    );

    // Step 4: update every chapter's title + description to the new
    // values taken from the docx headings.
    for (const { n, title, description } of this.chapters) {
      await queryRunner.query(
        `UPDATE chapters SET title = $1, description = $2 WHERE "chapterNumber" = $3`,
        [title, description, n]
      );
    }

    // Step 5: rename each quiz title so "Chapter N Quiz" matches the
    // chapter's new number, and refresh the description.
    for (const { n, title } of this.chapters) {
      await queryRunner.query(
        `UPDATE quizzes
            SET title = $1,
                description = $2
          WHERE "chapterId" IN (
            SELECT id FROM chapters WHERE "chapterNumber" = $3
          )`,
        [`Chapter ${n} Quiz`, `Test your knowledge of ${title}`, n]
      );
    }
  }

  public async down(): Promise<void> {
    // Intentional no-op. Reverting requires recovering the old chapter
    // structure + UUIDs from a backup; we don't keep that information
    // here. The forward migration is idempotent enough that re-running
    // it is safe; rollback is not.
  }
}
