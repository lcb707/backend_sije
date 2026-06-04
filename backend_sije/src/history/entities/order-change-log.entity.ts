import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChangeableField } from '../../common/enums/changeable-field.enum';
import { ChangeableValue } from '../../common/types/order-field.types';

/**
 * 델타: 승인되어 실제 반영된 필드 단위 변경(old → new). 이력/비교의 감사 근거.
 * 실제로 값이 바뀐 필드만 기록한다(요청했으나 값이 동일하면 로그 제외).
 */
@Entity('order_change_logs')
@Index('idx_order_version', ['orderId', 'version'])
export class OrderChangeLog {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'order_id', type: 'int', unsigned: true })
  orderId!: number;

  // 이 변경으로 만들어진 버전.
  @Column({ type: 'int', unsigned: true })
  version!: number;

  @Column({ name: 'change_request_id', type: 'int', unsigned: true })
  changeRequestId!: number;

  @Column({ type: 'enum', enum: ChangeableField })
  field!: ChangeableField;

  /** SPECS 의 특정 키만 바뀐 경우 그 키(예: 'color'). 필드 전체 변경이면 null. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  path!: string | null;

  // 변경 전 값. 신규 사양 키 추가처럼 이전 값이 없으면 null.
  @Column({ name: 'old_value', type: 'json', nullable: true })
  oldValue!: ChangeableValue | null;

  @Column({ name: 'new_value', type: 'json' })
  newValue!: ChangeableValue;

  // 변경요청 사유를 역정규화 보관(이력 조회 시 조인 없이 노출).
  @Column({ type: 'varchar', length: 500 })
  reason!: string;

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
