import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Question } from './Question';
import { QuizAttempt } from './QuizAttempt';

@Entity('quiz_answers')
@Index(['attemptId', 'questionId'])
export class QuizAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  attemptId: string;

  @Column()
  questionId: string;

  @Column({ nullable: true })
  selectedOptionId?: string;

  @Column({ nullable: true })
  answerText?: string;

  @Column({ type: 'boolean', nullable: true })
  isCorrect?: boolean;

  @Column({ type: 'float', nullable: true })
  earnedPoints?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => QuizAttempt, (attempt) => attempt.answers, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attemptId' })
  attempt: QuizAttempt;

  @ManyToOne(() => Question, (question) => question.answers, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: Question;
}
