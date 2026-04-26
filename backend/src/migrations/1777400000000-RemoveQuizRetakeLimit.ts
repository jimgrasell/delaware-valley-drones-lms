import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove the 3-attempt cap on quizzes — students can now retake any
 * quiz (including the practice exam) as many times as they want.
 *
 * The check in QuizService.getQuizQuestions already treats
 * `maxRetakes <= 0` as "no limit", so setting every quiz's
 * maxRetakes to 0 is sufficient — no service code change needed.
 */
export class RemoveQuizRetakeLimit1777400000000 implements MigrationInterface {
  name = 'RemoveQuizRetakeLimit1777400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE quizzes SET "maxRetakes" = 0 WHERE "maxRetakes" <> 0`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentional no-op. If you need a per-quiz limit again, set it
    // explicitly on the rows you want; we don't restore the old "3".
  }
}
