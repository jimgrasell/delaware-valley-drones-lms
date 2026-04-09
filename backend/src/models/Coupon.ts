import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

@Entity('coupons')
@Index(['code'], { unique: true })
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  description: string;

  @Column({ type: 'enum', enum: CouponType, default: CouponType.PERCENTAGE })
  type: CouponType;

  @Column({ type: 'float' })
  value: number; // percentage (0-100) or fixed amount in cents

  @Column({ type: 'integer', default: 0 })
  usageLimit: number; // 0 = unlimited

  @Column({ type: 'integer', default: 0 })
  timesUsed: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
