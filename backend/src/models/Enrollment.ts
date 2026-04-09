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

export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
}

@Entity('enrollments')
@Index(['studentId', 'createdAt'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studentId: string;

  @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.ACTIVE })
  status: EnrollmentStatus;

  @Column({ type: 'float', default: 0 })
  progress: number;

  @Column({ type: 'integer', default: 0 })
  completedChapters: number;

  @Column({ type: 'boolean', default: false })
  certificateIssued: boolean;

  @Column({ type: 'timestamp', nullable: true })
  certificateIssuedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.enrollments, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;
}
