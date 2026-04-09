import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Quiz } from './Quiz';
import { ChapterProgress } from './ChapterProgress';

@Entity('chapters')
@Index(['chapterNumber'], { unique: true })
export class Chapter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  chapterNumber: number;

  @Column({ nullable: true })
  videoUrl?: string;

  @Column({ nullable: true })
  videoVimeoId?: string;

  @Column({ type: 'integer', default: 0 })
  videoDurationSeconds: number;

  @Column({ nullable: true })
  content?: string;

  @Column({ nullable: true })
  downloadUrl?: string;

  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Quiz, (quiz) => quiz.chapter, { cascade: true })
  quizzes: Quiz[];

  @OneToMany(() => ChapterProgress, (progress) => progress.chapter, { cascade: true })
  progress: ChapterProgress[];
}
