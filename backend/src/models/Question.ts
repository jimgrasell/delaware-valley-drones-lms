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
import { Quiz } from './Quiz';
import { QuestionOption } from './QuestionOption';
import { QuizAnswer } from './QuizAnswer';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  MATCHING = 'matching',
}

@Entity('questions')
@Index(['quizId'])
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  quizId: string;

  @Column()
  questionText: string;

  @Column({ type: 'enum', enum: QuestionType, default: QuestionType.MULTIPLE_CHOICE })
  type: QuestionType;

  @Column({ nullable: true })
  explanation?: string;

  @Column({ type: 'integer', default: 1 })
  points: number;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Quiz, (quiz) => quiz.questions, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @OneToMany(() => QuestionOption, (option) => option.question, { cascade: true, eager: true })
  options: QuestionOption[];

  @OneToMany(() => QuizAnswer, (answer) => answer.question, { cascade: true })
  answers: QuizAnswer[];
}
