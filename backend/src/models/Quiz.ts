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
import { Chapter } from './Chapter';
import { Question } from './Question';
import { QuizAttempt } from './QuizAttempt';

@Entity('quizzes')
@Index(['chapterId'])
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  chapterId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'integer', default: 10 })
  passingScore: number;

  @Column({ type: 'integer', default: 0 })
  totalQuestions: number;

  @Column({ type: 'integer', nullable: true })
  timeLimit?: number; // in minutes, null = no limit

  @Column({ type: 'boolean', default: true })
  allowRetakes: boolean;

  @Column({ type: 'integer', default: 3 })
  maxRetakes: number;

  @Column({ type: 'boolean', default: true })
  shuffleQuestions: boolean;

  @Column({ type: 'boolean', default: true })
  showCorrectAnswers: boolean;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Chapter, (chapter) => chapter.quizzes, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chapterId' })
  chapter: Chapter;

  @OneToMany(() => Question, (question) => question.quiz, { cascade: true })
  questions: Question[];

  @OneToMany(() => QuizAttempt, (attempt) => attempt.quiz, { cascade: true })
  attempts: QuizAttempt[];
}
