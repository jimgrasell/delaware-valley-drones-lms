import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './User';
import { Quiz } from './Quiz';
import { QuizAnswer } from './QuizAnswer';

export enum AttemptStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  FAILED = 'failed',
}

@Entity('quiz_attempts')
@Index(['studentId', 'quizId'])
export class QuizAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studentId: string;

  @Column()
  quizId: string;

  @Column({ type: 'enum', enum: AttemptStatus, default: AttemptStatus.IN_PROGRESS })
  status: AttemptStatus;

  @Column({ type: 'float', nullable: true })
  score?: number; // percentage 0-100

  @Column({ type: 'boolean', nullable: true })
  passed?: boolean;

  @Column({ type: 'integer', default: 0 })
  questionsAnswered: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'integer', nullable: true })
  timeSpentSeconds?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.quizAttempts, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Quiz, (quiz) => quiz.attempts, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @OneToMany(() => QuizAnswer, (answer) => answer.attempt, { cascade: true })
  answers: QuizAnswer[];
}
