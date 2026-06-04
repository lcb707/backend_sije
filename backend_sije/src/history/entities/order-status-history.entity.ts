import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';

/**
 * 상태 전이 이력. 스냅샷(값 이력)과 분리해 "그 시점에 실제로 어떤 상태였는지"를 보존한다.
 *
 * 유효 구간 [valid_from, valid_to) 반열림:
 *  - 발주서 생성 시 DRAFT 구간 1건이 열리고, 상태 전이마다 직전 구간을 valid_to=now 로 닫고
 *    새 상태 구간(valid_to=NULL)을 연다.
 *  - 시점 조회 status 는 스냅샷의 status 가 아니라 이 테이블에서 그 시점 유효 구간으로 보정한다.
 */
@Entity('order_status_history')
@Index('idx_status_order_valid_from', ['orderId', 'validFrom'])
export class OrderStatusHistory {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'order_id', type: 'int', unsigned: true })
  orderId!: number;

  @Column({ type: 'enum', enum: OrderStatus })
  status!: OrderStatus;

  @Column({ name: 'valid_from', type: 'datetime', precision: 3 })
  validFrom!: Date;

  @Column({ name: 'valid_to', type: 'datetime', precision: 3, nullable: true })
  validTo!: Date | null;

  @Column({ name: 'changed_by', type: 'varchar', length: 255 })
  changedBy!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt!: Date;
}
