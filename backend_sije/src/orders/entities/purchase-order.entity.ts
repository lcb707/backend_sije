import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';
import { OrderSpecs } from '../../common/types/order-field.types';

/**
 * 발주서 "현재" 상태 + 메타.
 * 과거 상태는 PurchaseOrderSnapshot 이 보유하고, 본 테이블은 최신 값만 유지한다(읽기 편의).
 *
 * PROD-NOTE: 실서비스에서는 동시 승인 충돌(lost update) 방지를 위해 @VersionColumn 낙관적 락이 필요.
 * 과제 범위 제외로 미구현. (근거: docs/DESIGN_DECISIONS.md §5)
 */
@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

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

  // 가변 사양은 JSON 으로 보관(색상/사이즈 등).
  @Column({ type: 'json' })
  specs!: OrderSpecs;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.DRAFT })
  status!: OrderStatus;

  // 현재 스냅샷 버전. 생성 시 1, 승인마다 +1.
  @Column({ name: 'current_version', type: 'int', unsigned: true, default: 1 })
  currentVersion!: number;

  @Column({ name: 'created_by', type: 'varchar', length: 255 })
  createdBy!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
    onUpdate: 'CURRENT_TIMESTAMP(3)',
  })
  updatedAt!: Date;
}
