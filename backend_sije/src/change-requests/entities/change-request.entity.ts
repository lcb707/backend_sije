import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChangeRequestStatus } from '../../common/enums/change-request-status.enum';
import { ChangeRequestItem } from './change-request-item.entity';

/**
 * 변경 요청(주문자가 제출한 변경 의도). 승인 전에는 발주서에 반영되지 않는다.
 * (order_id, status) 인덱스로 "동일 발주서 PENDING 존재" 검사를 빠르게 한다.
 */
@Entity('change_requests')
@Index('idx_order_status', ['orderId', 'status'])
export class ChangeRequest {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'order_id', type: 'int', unsigned: true })
  orderId!: number;

  @Column({ type: 'varchar', length: 500 })
  reason!: string;

  @Column({
    type: 'enum',
    enum: ChangeRequestStatus,
    default: ChangeRequestStatus.PENDING,
  })
  status!: ChangeRequestStatus;

  @Column({ name: 'requested_by', type: 'varchar', length: 255 })
  requestedBy!: string;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 255, nullable: true })
  reviewedBy!: string | null;

  @Column({
    name: 'review_comment',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  reviewComment!: string | null;

  // 승인 시 생성된 버전(반려/대기 중엔 NULL).
  @Column({
    name: 'resulting_version',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  resultingVersion!: number | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt!: Date;

  @Column({
    name: 'reviewed_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  reviewedAt!: Date | null;

  @OneToMany(() => ChangeRequestItem, (item) => item.changeRequest, {
    cascade: true,
  })
  items!: ChangeRequestItem[];
}
