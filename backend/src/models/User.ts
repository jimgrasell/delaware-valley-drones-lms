import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Enrollment } from './Enrollment';
import { QuizAttempt } from './QuizAttempt';
import { Payment } from './Payment';
import { ForumPost } from './ForumPost';
import { ForumReply } from './ForumReply';
import { Certificate } from './Certificate';

export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpiry?: Date;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isBlocked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Enrollment, (enrollment) => enrollment.student, { cascade: true })
  enrollments: Enrollment[];

  @OneToMany(() => QuizAttempt, (attempt) => attempt.student, { cascade: true })
  quizAttempts: QuizAttempt[];

  @OneToMany(() => Payment, (payment) => payment.user, { cascade: true })
  payments: Payment[];

  @OneToMany(() => ForumPost, (post) => post.author, { cascade: true })
  forumPosts: ForumPost[];

  @OneToMany(() => ForumReply, (reply) => reply.author, { cascade: true })
  forumReplies: ForumReply[];

  @OneToMany(() => Certificate, (cert) => cert.user, { cascade: true })
  certificates: Certificate[];

  // Methods
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.passwordHash && !this.passwordHash.startsWith('$2a$') && !this.passwordHash.startsWith('$2b$')) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get name(): string {
    return this.getFullName();
  }

  toJSON() {
    const { passwordHash, ...rest } = this;
    return rest;
  }
}
