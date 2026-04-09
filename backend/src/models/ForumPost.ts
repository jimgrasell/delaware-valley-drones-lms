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
import { ForumReply } from './ForumReply';

@Entity('forum_posts')
@Index(['authorId', 'createdAt'])
export class ForumPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  authorId: string;

  @Column()
  title: string;

  @Column()
  content: string;

  @Column({ type: 'integer', default: 0 })
  replyCount: number;

  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'boolean', default: false })
  isClosed: boolean;

  @Column({ nullable: true })
  tags?: string; // JSON array or comma-separated

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.forumPosts, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @OneToMany(() => ForumReply, (reply) => reply.post, { cascade: true })
  replies: ForumReply[];
}
