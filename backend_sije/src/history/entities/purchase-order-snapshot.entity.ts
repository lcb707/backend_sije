import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';
import { OrderSpecs } from '../../common/types/order-field.types';

/**
 * 버전별 발주서 전체 상태(스냅샷). 버전/시점 조회의 단일 진실 소스.
 *
 * 유효 구간 [valid_from, valid_to) 반열림:
 *  - valid_from 시각 자체는 이 버전에 포함, valid_to 시각은 다음 버전에 속한다.
 *  - 최신 버전은 valid_to = NULL(현재 유효).
 */
@Entity('purchase_order_snapshots')
@Unique('uq_order_version', ['orderId', 'version'])
@Index('idx_order_valid_from', ['orderId', 'validFrom'])
export class PurchaseOrderSnapshot {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'order_id', type: 'int', unsigned: true })
  orderId!: number;

  @Column({ type: 'int', unsigned: true })
  version!: number;

  // ── 당시 상태(발주서 전체 복제) ──
  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName!: string;

  @Column({ type: 'int', unsigned: true })
  quantity!: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitPrice!: number;

  @Column({ type: 'json' })
  specs!: OrderSpecs;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string;

  @Column({ type: 'enum', enum: OrderStatus })
  status!: OrderStatus;

  // ── 유효 구간 ──
  @Column({ name: 'valid_from', type: 'datetime', precision: 3 })
  validFrom!: Date;

  @Column({ name: 'valid_to', type: 'datetime', precision: 3, nullable: true })
  validTo!: Date | null;

  // 이 버전을 만든 변경요청(버전1=생성이므로 NULL).
  @Column({
    name: 'change_request_id',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  changeRequestId!: number | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt!: Date;
}
