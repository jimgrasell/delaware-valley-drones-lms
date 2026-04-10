import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

// Seed initial data (admin/instructor/test users, 13 chapters with quizzes
// and sample questions, promo coupons). Assumes the schema already exists —
// run this after the tables have been created either by DB_SYNCHRONIZE=true
// on first boot or by a dedicated schema migration.
//
// Safe to run exactly once. Uses ON CONFLICT DO NOTHING on unique columns so
// re-running won't crash on duplicate keys.
export class SeedInitialData1712700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // --------------------------------------------------------------------
    // Users
    // --------------------------------------------------------------------
    const users = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        firstName: 'James',
        lastName: 'Grasell',
        email: 'admin@delawarevalleydrones.com',
        role: 'admin',
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        firstName: 'James',
        lastName: 'Grasell',
        email: 'instructor@delawarevalleydrones.com',
        role: 'instructor',
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        firstName: 'Test',
        lastName: 'Student',
        email: 'student@example.com',
        role: 'student',
      },
    ];

    for (const u of users) {
      const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
      await queryRunner.query(
        `INSERT INTO "users"
           ("id", "firstName", "lastName", "email", "passwordHash", "role", "emailVerified", "isActive", "isBlocked", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         ON CONFLICT ("email") DO NOTHING`,
        [u.id, u.firstName, u.lastName, u.email, passwordHash, u.role, true, true, false]
      );
    }

    // --------------------------------------------------------------------
    // Chapters (13) + per-chapter Quiz + 10 sample questions + 4 options
    // --------------------------------------------------------------------
    const chapters = [
      { number: 1, title: 'Introduction to UAS and Remote Pilot Regulations', description: 'Learn the fundamentals of Unmanned Aircraft Systems (UAS) and the regulatory framework established by the FAA.' },
      { number: 2, title: 'Airspace and Operations', description: 'Understand airspace classifications and rules for safe UAS operations in different environments.' },
      { number: 3, title: 'Safety and Emergency Procedures', description: 'Master safety protocols and emergency procedures for safe flight operations.' },
      { number: 4, title: 'Basic Flight Principles', description: 'Explore fundamental aerodynamics and flight control principles for remote pilots.' },
      { number: 5, title: 'Weather and Atmospheric Conditions', description: 'Learn how weather affects UAS performance and operations.' },
      { number: 6, title: 'Maintenance and Pre-Flight Checks', description: 'Understand proper aircraft maintenance and critical pre-flight inspection procedures.' },
      { number: 7, title: 'Visual Scanning and Situational Awareness', description: 'Develop techniques for effective scanning and maintaining situational awareness.' },
      { number: 8, title: 'Navigation and GPS Systems', description: 'Master navigation techniques and GPS system operations for accurate flight control.' },
      { number: 9, title: 'Remote Pilot in Command Responsibilities', description: 'Understand the legal responsibilities and duties of a Remote Pilot in Command.' },
      { number: 10, title: 'Night Operations and Advanced Scenarios', description: 'Explore special considerations for night operations and complex flight scenarios.' },
      { number: 11, title: 'Privacy, Security, and Ethical Considerations', description: 'Learn about legal and ethical issues surrounding UAS operations.' },
      { number: 12, title: 'Final Review and Test Preparation', description: 'Review key concepts and prepare for the knowledge test assessment.' },
      { number: 13, title: 'Certification Assessment', description: 'Final comprehensive assessment covering all course material. Must achieve 70% to pass.' },
    ];

    // Deterministic UUIDs so re-running stays idempotent.
    const cc = (n: number) => String(n).padStart(2, '0');
    const chapterUuid = (n: number) => `10000000-0000-0000-0000-0000000000${cc(n)}`;
    const quizUuid = (n: number) => `20000000-0000-0000-0000-0000000000${cc(n)}`;
    const questionUuid = (n: number, q: number) =>
      `30000000-0000-0000-0000-0000${cc(n)}0000${cc(q)}`;
    const optionUuid = (n: number, q: number, o: number) =>
      `40000000-0000-0000-0000-${cc(n)}${cc(q)}${cc(o)}000000`;

    for (const chapter of chapters) {
      const chapterId = chapterUuid(chapter.number);

      await queryRunner.query(
        `INSERT INTO "chapters"
           ("id", "title", "description", "chapterNumber", "isPublished", "content", "videoDurationSeconds", "order", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         ON CONFLICT ("id") DO NOTHING`,
        [
          chapterId,
          chapter.title,
          chapter.description,
          chapter.number,
          true,
          '<p>Chapter content coming soon. Check back for video lessons and study materials.</p>',
          0,
          chapter.number,
        ]
      );

      // Final assessment has a lower passing score (70%); the rest 80%.
      const passingScore = chapter.number === 13 ? 70 : 80;
      const quizId = quizUuid(chapter.number);

      await queryRunner.query(
        `INSERT INTO "quizzes"
           ("id", "chapterId", "title", "description", "totalQuestions", "passingScore", "timeLimit", "allowRetakes", "maxRetakes", "shuffleQuestions", "showCorrectAnswers", "order", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
         ON CONFLICT ("id") DO NOTHING`,
        [
          quizId,
          chapterId,
          `Chapter ${chapter.number} Quiz`,
          `Test your knowledge of ${chapter.title}`,
          10,
          passingScore,
          30,
          true,
          3,
          true,
          true,
          chapter.number,
        ]
      );

      for (let q = 1; q <= 10; q++) {
        const questionId = questionUuid(chapter.number, q);
        await queryRunner.query(
          `INSERT INTO "questions"
             ("id", "quizId", "questionText", "type", "points", "explanation", "order", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           ON CONFLICT ("id") DO NOTHING`,
          [
            questionId,
            quizId,
            `Sample Question ${q} for Chapter ${chapter.number}?`,
            'multiple_choice',
            10,
            'This is the correct answer because it follows FAA regulations.',
            q,
          ]
        );

        const options = [
          { text: 'Option A (Correct)', correct: true },
          { text: 'Option B', correct: false },
          { text: 'Option C', correct: false },
          { text: 'Option D', correct: false },
        ];

        for (let optIdx = 0; optIdx < options.length; optIdx++) {
          await queryRunner.query(
            `INSERT INTO "question_options"
               ("id", "questionId", "optionText", "isCorrect", "order", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING`,
            [
              optionUuid(chapter.number, q, optIdx),
              questionId,
              options[optIdx].text,
              options[optIdx].correct,
              optIdx,
            ]
          );
        }
      }
    }

    // --------------------------------------------------------------------
    // Sample coupons
    // --------------------------------------------------------------------
    const coupons = [
      { id: '50000000-0000-0000-0000-000000000001', code: 'EARLYBIRD', description: '10% off - Early bird special', type: 'percentage', value: 10, usageLimit: 100, timesUsed: 5, days: 30 },
      { id: '50000000-0000-0000-0000-000000000002', code: 'HOLIDAY20', description: '20% off - Holiday promotion', type: 'percentage', value: 20, usageLimit: 50, timesUsed: 10, days: 60 },
      { id: '50000000-0000-0000-0000-000000000003', code: 'SAVE15', description: '$15 off - Limited time', type: 'fixed_amount', value: 1500, usageLimit: 0, timesUsed: 25, days: 90 },
    ];

    for (const c of coupons) {
      const expiresAt = new Date(Date.now() + c.days * 24 * 60 * 60 * 1000);
      await queryRunner.query(
        `INSERT INTO "coupons"
           ("id", "code", "description", "type", "value", "usageLimit", "timesUsed", "isActive", "expiresAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         ON CONFLICT ("code") DO NOTHING`,
        [c.id, c.code, c.description, c.type, c.value, c.usageLimit, c.timesUsed, true, expiresAt]
      );
    }

    console.log('Seed data inserted successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "coupons"`);
    await queryRunner.query(`DELETE FROM "question_options"`);
    await queryRunner.query(`DELETE FROM "questions"`);
    await queryRunner.query(`DELETE FROM "quizzes"`);
    await queryRunner.query(`DELETE FROM "chapters"`);
    await queryRunner.query(`DELETE FROM "users"`);
  }
}
