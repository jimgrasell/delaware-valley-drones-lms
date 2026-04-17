import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Set every quiz's passingScore to 70 — matches the FAA Part 107
 * exam's actual passing threshold and aligns with the quiz result
 * email templates (which assume 70 throughout their copy).
 *
 * This fixes a data issue where the initial seed set passingScore
 * to 80 for all 13 chapter quizzes, which made students who scored
 * 70-79 receive the "not passed" email instead of the
 * "passed, aim higher" email.
 */
export class SetPassingScoreTo701776200000000 implements MigrationInterface {
  name = 'SetPassingScoreTo701776200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE quizzes SET "passingScore" = 70 WHERE "passingScore" <> 70`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentional no-op: we don't know each quiz's previous value.
    // If you need to revert, set it manually.
  }
}
