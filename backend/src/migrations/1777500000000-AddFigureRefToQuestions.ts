import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add a nullable figureRef column to questions so chart-dependent
 * Part 107 questions can carry a "FAA-CT-8080-2H, Figure 23, Area 4"
 * reference. The QuizPage renders this as a chip above the prompt
 * so students know which sectional excerpt to consult.
 */
export class AddFigureRefToQuestions1777500000000 implements MigrationInterface {
  name = 'AddFigureRefToQuestions1777500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE questions ADD COLUMN IF NOT EXISTS "figureRef" text`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE questions DROP COLUMN IF EXISTS "figureRef"`
    );
  }
}
