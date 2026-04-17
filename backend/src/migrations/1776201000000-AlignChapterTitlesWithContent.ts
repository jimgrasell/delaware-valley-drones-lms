import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The initial seed migration set 13 chapter titles based on a generic
 * curriculum outline. The actual uploaded docx content covers different
 * specific topics in a different order. This migration aligns the
 * chapter titles + descriptions with the content students are actually
 * reading. Titles and descriptions are taken verbatim from the docx
 * headings.
 */
export class AlignChapterTitlesWithContent1776201000000 implements MigrationInterface {
  name = 'AlignChapterTitlesWithContent1776201000000';

  private readonly updates: Array<{ n: number; title: string; description: string }> = [
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
      description: 'Mastering the Six Airspace Classes and Sectional Charts',
    },
    {
      n: 6,
      title: 'Airspace Operations and Restrictions',
      description: 'Operating Requirements, ATC Communication, NOTAMs, TFRs, and Special Use Airspace',
    },
    {
      n: 7,
      title: 'Aviation Weather Sources and Interpretation',
      description: 'METARs, TAFs, Aviation Forecasts, and Weather Decision-Making',
    },
    {
      n: 8,
      title: 'Weather Effects on sUAS Performance',
      description: 'Density Altitude, Wind Effects, Temperature, and Severe Weather',
    },
    {
      n: 9,
      title: 'Weight, Balance, and Aircraft Performance',
      description: 'Center of Gravity, Payload Planning, and Mission Optimization',
    },
    {
      n: 10,
      title: 'Radio Communications and Airport Operations',
      description: 'Aviation Radio, Traffic Patterns, Runway Designations, and Light Signals',
    },
    {
      n: 11,
      title: 'Emergency Procedures and Risk Management',
      description: 'Decision-Making, Crew Resource Management, and Accident Prevention',
    },
    {
      n: 12,
      title: 'Physiological Factors and Aircraft Maintenance',
      description: 'Fitness to Fly, Battery Care, Preflight Inspection, and Maintenance',
    },
    {
      n: 13,
      title: 'Practice Exam 1',
      description: '60-Question Full-Length Practice Assessment',
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { n, title, description } of this.updates) {
      await queryRunner.query(
        `UPDATE chapters SET title = $1, description = $2 WHERE "chapterNumber" = $3`,
        [title, description, n]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentional no-op: previous titles were inaccurate generic
    // curriculum labels. If a revert is truly needed, restore from a
    // database backup — we don't keep the old strings around.
  }
}
