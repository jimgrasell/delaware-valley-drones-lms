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

@Entity('certificates')
@Index(['userId', 'createdAt'])
@Index(['verificationId'], { unique: true })
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ unique: true })
  verificationId: string; // Unique ID for certificate verification

  @Column({ type: 'float', default: 0 })
  finalScore: number;

  @Column({ nullable: true })
  certificateUrl?: string; // S3 URL to PDF

  @Column({ type: 'timestamp', nullable: true })
  completionDate?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.certificates, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
