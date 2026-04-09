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
import { User } from './User';
import { Chapter } from './Chapter';

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('chapter_progress')
@Index(['userId', 'chapterId'], { unique: true })
export class ChapterProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  chapterId: string;

  @Column({ type: 'enum', enum: ProgressStatus, default: ProgressStatus.NOT_STARTED })
  status: ProgressStatus;

  @Column({ type: 'boolean', default: false })
  videoWatched: boolean;

  @Column({ type: 'timestamp', nullable: true })
  videoWatchedAt?: Date;

  @Column({ type: 'float', default: 0 })
  videoProgress: number; // percentage 0-100

  @Column({ type: 'boolean', default: false })
  quizPassed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  quizPassedAt?: Date;

  @Column({ type: 'float', default: 0 })
  bestQuizScore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Chapter, (chapter) => chapter.progress, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chapterId' })
  chapter: Chapter;
}
