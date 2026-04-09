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
import { ForumPost } from './ForumPost';

@Entity('forum_replies')
@Index(['postId', 'createdAt'])
@Index(['authorId'])
export class ForumReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  postId: string;

  @Column()
  authorId: string;

  @Column()
  content: string;

  @Column({ type: 'boolean', default: false })
  isMarkedAsAnswer: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ForumPost, (post) => post.replies, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: ForumPost;

  @ManyToOne(() => User, (user) => user.forumReplies, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;
}
