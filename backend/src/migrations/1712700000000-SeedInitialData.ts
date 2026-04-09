import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedInitialData1712700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admin user
    const adminPasswordHash = await bcrypt.hash('ChangeMe123!', 12);
    await queryRunner.query(
      `INSERT INTO "users" ("id", "name", "email", "password", "role", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        '00000000-0000-0000-0000-000000000001',
        'James Grasell',
        'admin@delawarevalleydrones.com',
        adminPasswordHash,
        'admin',
        new Date(),
        new Date(),
      ]
    );

    // Create instructor user
    const instructorPasswordHash = await bcrypt.hash('ChangeMe123!', 12);
    await queryRunner.query(
      `INSERT INTO "users" ("id", "name", "email", "password", "role", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        '00000000-0000-0000-0000-000000000002',
        'James Grasell (Instructor)',
        'instructor@delawarevalleydrones.com',
        instructorPasswordHash,
        'instructor',
        new Date(),
        new Date(),
      ]
    );

    // Create test student
    const studentPasswordHash = await bcrypt.hash('ChangeMe123!', 12);
    await queryRunner.query(
      `INSERT INTO "users" ("id", "name", "email", "password", "role", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        '00000000-0000-0000-0000-000000000003',
        'Test Student',
        'student@example.com',
        studentPasswordHash,
        'student',
        new Date(),
        new Date(),
      ]
    );

    // Create 13 chapters
    const chapters = [
      {
        number: 1,
        title: 'Introduction to UAS and Remote Pilot Regulations',
        description:
          'Learn the fundamentals of Unmanned Aircraft Systems (UAS) and the regulatory framework established by the FAA.',
      },
      {
        number: 2,
        title: 'Airspace and Operations',
        description:
          'Understand airspace classifications and rules for safe UAS operations in different environments.',
      },
      {
        number: 3,
        title: 'Safety and Emergency Procedures',
        description: 'Master safety protocols and emergency procedures for safe flight operations.',
      },
      {
        number: 4,
        title: 'Basic Flight Principles',
        description: 'Explore fundamental aerodynamics and flight control principles for remote pilots.',
      },
      {
        number: 5,
        title: 'Weather and Atmospheric Conditions',
        description: 'Learn how weather affects UAS performance and operations.',
      },
      {
        number: 6,
        title: 'Maintenance and Pre-Flight Checks',
        description: 'Understand proper aircraft maintenance and critical pre-flight inspection procedures.',
      },
      {
        number: 7,
        title: 'Visual Scanning and Situational Awareness',
        description: 'Develop techniques for effective scanning and maintaining situational awareness.',
      },
      {
        number: 8,
        title: 'Navigation and GPS Systems',
        description: 'Master navigation techniques and GPS system operations for accurate flight control.',
      },
      {
        number: 9,
        title: 'Remote Pilot in Command Responsibilities',
        description: 'Understand the legal responsibilities and duties of a Remote Pilot in Command.',
      },
      {
        number: 10,
        title: 'Night Operations and Advanced Scenarios',
        description: 'Explore special considerations for night operations and complex flight scenarios.',
      },
      {
        number: 11,
        title: 'Privacy, Security, and Ethical Considerations',
        description: 'Learn about legal and ethical issues surrounding UAS operations.',
      },
      {
        number: 12,
        title: 'Final Review and Test Preparation',
        description: 'Review key concepts and prepare for the knowledge test assessment.',
      },
      {
        number: 13,
        title: 'Certification Assessment',
        description:
          'Final comprehensive assessment covering all course material. Must achieve 70% to pass.',
      },
    ];

    for (const chapter of chapters) {
      const chapterId = '10000000-0000-0000-0000-' + String(chapter.number).padStart(12, '0');
      await queryRunner.query(
        `INSERT INTO "chapters" ("id", "title", "description", "chapterNumber", "published", "contentHtml", "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          chapterId,
          chapter.title,
          chapter.description,
          chapter.number,
          true,
          '<p>Chapter content coming soon. Check back for video lessons and study materials.</p>',
          new Date(),
          new Date(),
        ]
      );

      // Create quiz for each chapter (except the last one which is the final assessment)
      const passingScore = chapter.number === 13 ? 70 : 80;
      const quizId = '20000000-0000-0000-0000-' + String(chapter.number).padStart(12, '0');

      await queryRunner.query(
        `INSERT INTO "quizzes" ("id", "chapterId", "title", "description", "totalQuestions", "passingScore", "timeLimit", "allowRetakes", "maxRetakes", "shuffleQuestions", "showCorrectAnswers", "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
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
          new Date(),
          new Date(),
        ]
      );

      // Create 10 sample questions for each quiz
      for (let q = 1; q <= 10; q++) {
        const questionId = '30000000-0000-0000-' + String(chapter.number).padStart(4, '0') + '-' + String(q).padStart(8, '0');

        await queryRunner.query(
          `INSERT INTO "questions" ("id", "quizId", "questionText", "type", "points", "explanation", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            questionId,
            quizId,
            `Sample Question ${q} for Chapter ${chapter.number}?`,
            'multiple_choice',
            10,
            'This is the correct answer because it follows FAA regulations.',
            new Date(),
            new Date(),
          ]
        );

        // Create 4 options for each question (1 correct, 3 incorrect)
        const options = [
          { text: 'Option A (Correct)', correct: true },
          { text: 'Option B', correct: false },
          { text: 'Option C', correct: false },
          { text: 'Option D', correct: false },
        ];

        for (let optIdx = 0; optIdx < options.length; optIdx++) {
          const optionId = '40000000-0000-0000-' + String(chapter.number).padStart(4, '0') + '-' + String(q).padStart(2, '0') + String(optIdx).padStart(2, '0');

          await queryRunner.query(
            `INSERT INTO "question_options" ("id", "questionId", "optionText", "isCorrect", "createdAt", "updatedAt") 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              optionId,
              questionId,
              options[optIdx].text,
              options[optIdx].correct,
              new Date(),
              new Date(),
            ]
          );
        }
      }
    }

    // Create sample coupons
    await queryRunner.query(
      `INSERT INTO "coupons" ("id", "code", "description", "type", "value", "usageLimit", "timesUsed", "isActive", "expiresAt", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        '50000000-0000-0000-0000-000000000001',
        'EARLYBIRD',
        '10% off - Early bird special',
        'percentage',
        10,
        100,
        5,
        true,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        new Date(),
        new Date(),
      ]
    );

    await queryRunner.query(
      `INSERT INTO "coupons" ("id", "code", "description", "type", "value", "usageLimit", "timesUsed", "isActive", "expiresAt", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        '50000000-0000-0000-0000-000000000002',
        'HOLIDAY20',
        '20% off - Holiday promotion',
        'percentage',
        20,
        50,
        10,
        true,
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        new Date(),
        new Date(),
      ]
    );

    await queryRunner.query(
      `INSERT INTO "coupons" ("id", "code", "description", "type", "value", "usageLimit", "timesUsed", "isActive", "expiresAt", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        '50000000-0000-0000-0000-000000000003',
        'SAVE15',
        '$15 off - Limited time',
        'fixed_amount',
        1500,
        0,
        25,
        true,
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        new Date(),
        new Date(),
      ]
    );

    console.log('Seed data has been successfully inserted!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete seed data in reverse order
    await queryRunner.query(`DELETE FROM "coupons"`);
    await queryRunner.query(`DELETE FROM "question_options"`);
    await queryRunner.query(`DELETE FROM "questions"`);
    await queryRunner.query(`DELETE FROM "quizzes"`);
    await queryRunner.query(`DELETE FROM "chapters"`);
    await queryRunner.query(`DELETE FROM "users"`);
  }
}
