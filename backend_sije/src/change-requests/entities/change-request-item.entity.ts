import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChangeableField } from '../../common/enums/changeable-field.enum';
import { ChangeableValue } from '../../common/types/order-field.types';
import { ChangeRequest } from './change-request.entity';

/**
 * 변경 요청의 개별 필드 변경 항목.
 * 요청 시점에는 new_value 만 저장한다(old 는 승인 시점의 현재값이 진실이므로 델타에서 확정).
 */
@Entity('change_request_items')
export class ChangeRequestItem {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'change_request_id', type: 'int', unsigned: true })
  changeRequestId!: number;

  @Column({ type: 'enum', enum: ChangeableField })
  field!: ChangeableField;

  /**
   * SPECS 의 특정 하위 키만 변경할 때의 키 이름(예: 'color').
   * null 이면 해당 필드 전체를 교체한다(예: quantity, 또는 specs 통째 교체).
   * SPECS 가 아닌 필드에는 항상 null.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  path!: string | null;

  // 타입(문자열/숫자/객체) 보존을 위해 JSON 으로 저장.
  // path 가 있으면 그 키의 스칼라 값, 없으면 필드 전체 값.
  @Column({ name: 'new_value', type: 'json' })
  newValue!: ChangeableValue;

  @ManyToOne(() => ChangeRequest, (cr) => cr.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'change_request_id' })
  changeRequest!: ChangeRequest;
}
