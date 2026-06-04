import { ApiProperty } from '@nestjs/swagger';
import { ChangeRequest } from '../../change-requests/entities/change-request.entity';
import { ChangeRequestStatus } from '../../common/enums/change-request-status.enum';
import { ChangeableField } from '../../common/enums/changeable-field.enum';
import { FIELD_ACCESSORS } from '../../common/types/order-field.accessors';
import { ChangeableValue } from '../../common/types/order-field.types';
import { OrderChangeLog } from '../entities/order-change-log.entity';
import { PurchaseOrderSnapshot } from '../entities/purchase-order-snapshot.entity';
import { SnapshotStateDto } from './snapshot-state.dto';

/**
 * 이력 항목 종류. 승인되어 버전이 생긴 변경(VERSION)과
 * 발주서에 반영되지 않은 변경요청(REJECTED/PENDING)을 구분한다.
 */
export enum HistoryEntryKind {
  VERSION = 'VERSION',
  CHANGE_REQUEST = 'CHANGE_REQUEST',
}

/** 한 버전에서 바뀐 필드 델타. */
export class ChangeLogDto {
  @ApiProperty({ enum: ChangeableField })
  field!: ChangeableField;

  @ApiProperty({
    nullable: true,
    example: 'color',
    description: 'specs 의 특정 키만 바뀐 경우 그 키(아니면 null)',
  })
  path!: string | null;

  @ApiProperty({
    example: 1000,
    nullable: true,
    description: '미반영 변경요청 항목/신규 사양 키는 이전값이 없어 null',
  })
  oldValue!: ChangeableValue | null;

  @ApiProperty({ example: 1500 })
  newValue!: ChangeableValue;

  @ApiProperty({ example: '고객사 추가 주문으로 수량 상향' })
  reason!: string;

  static fromEntity(log: OrderChangeLog): ChangeLogDto {
    const dto = new ChangeLogDto();
    dto.field = log.field;
    dto.path = log.path;
    dto.oldValue = log.oldValue;
    dto.newValue = log.newValue;
    dto.reason = log.reason;
    return dto;
  }
}

/**
 * 이력 한 항목. 두 종류를 한 타임라인으로 합친다.
 *  - VERSION: 승인되어 버전이 생긴 변경(전체 상태 + 델타 보유).
 *  - CHANGE_REQUEST: 거절/대기 변경요청(발주서 미반영, version/state 없음).
 */
export class HistoryEntryDto {
  @ApiProperty({ enum: HistoryEntryKind })
  kind!: HistoryEntryKind;

  @ApiProperty({
    nullable: true,
    example: 2,
    description: 'VERSION 항목의 버전(변경요청 항목은 null)',
  })
  version!: number | null;

  @ApiProperty({
    description: '발생 시각(버전=validFrom, 변경요청=생성/검토 시각)',
  })
  occurredAt!: Date;

  @ApiProperty({
    type: SnapshotStateDto,
    nullable: true,
    description: 'VERSION 항목의 전체 상태(변경요청 항목은 null)',
  })
  state!: SnapshotStateDto | null;

  @ApiProperty({ type: [ChangeLogDto], description: '버전1(생성)은 빈 배열' })
  changes!: ChangeLogDto[];

  @ApiProperty({
    nullable: true,
    example: 5,
    description: '관련 변경요청 ID',
  })
  changeRequestId!: number | null;

  @ApiProperty({
    enum: ChangeRequestStatus,
    nullable: true,
    description: '관련 변경요청 상태(REJECTED/PENDING 등)',
  })
  changeRequestStatus!: ChangeRequestStatus | null;

  static build(
    snapshot: PurchaseOrderSnapshot,
    logs: OrderChangeLog[],
  ): HistoryEntryDto {
    const dto = new HistoryEntryDto();
    dto.kind = HistoryEntryKind.VERSION;
    dto.version = snapshot.version;
    dto.occurredAt = snapshot.validFrom;
    dto.state = SnapshotStateDto.fromEntity(snapshot);
    dto.changes = logs.map((log) => ChangeLogDto.fromEntity(log));
    dto.changeRequestId = snapshot.changeRequestId;
    dto.changeRequestStatus = null;
    return dto;
  }

  /**
   * 변경요청이 타임라인에서 발생한 것으로 보는 시각.
   * 검토(반려) 시각이 있으면 그 시각, 없으면(대기) 생성 시각.
   */
  static occurredAtOf(cr: ChangeRequest): Date {
    return cr.reviewedAt ?? cr.createdAt;
  }

  /**
   * 발주서에 반영되지 않은 변경요청(거절/대기)을 이력 항목으로 변환.
   *
   * occurredAt 시점에 유효했던 스냅샷(snapshotAt)을 기준으로
   *  - state: 그 시점의 발주서 전체 상세(반려/대기 항목도 일관되게 상세 노출)
   *  - 각 항목 oldValue: 그 시점의 해당 필드/사양 키 값(없으면 null)
   * 을 채운다. 시점 스냅샷이 없으면(최초 생성 이전) state=null, oldValue=null.
   */
  static fromChangeRequest(
    cr: ChangeRequest,
    snapshotAt: PurchaseOrderSnapshot | null,
  ): HistoryEntryDto {
    const dto = new HistoryEntryDto();
    dto.kind = HistoryEntryKind.CHANGE_REQUEST;
    dto.version = null;
    dto.occurredAt = HistoryEntryDto.occurredAtOf(cr);
    dto.state = snapshotAt ? SnapshotStateDto.fromEntity(snapshotAt) : null;
    dto.changes = (cr.items ?? []).map((item) => {
      const log = new ChangeLogDto();
      log.field = item.field;
      log.path = item.path;
      log.oldValue = HistoryEntryDto.readSnapshotValue(
        snapshotAt,
        item.field,
        item.path,
      );
      log.newValue = item.newValue;
      log.reason = cr.reason;
      return log;
    });
    dto.changeRequestId = cr.id;
    dto.changeRequestStatus = cr.status;
    return dto;
  }

  /** 스냅샷에서 한 필드(또는 specs 키)의 값을 읽는다. 없으면 null. */
  private static readSnapshotValue(
    snapshot: PurchaseOrderSnapshot | null,
    field: ChangeableField,
    path: string | null,
  ): ChangeableValue | null {
    if (!snapshot) {
      return null;
    }
    if (field === ChangeableField.SPECS) {
      return path ? (snapshot.specs?.[path] ?? null) : (snapshot.specs ?? null);
    }
    return FIELD_ACCESSORS[field].get(snapshot) ?? null;
  }
}
