import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ChangeRequest } from '../change-requests/entities/change-request.entity';
import { valuesEqual } from '../change-requests/order-field.util';
import { ERROR_MESSAGES } from '../common/constants/error-messages';
import { ChangeRequestStatus } from '../common/enums/change-request-status.enum';
import { ChangeableField } from '../common/enums/changeable-field.enum';
import { FIELD_ACCESSORS } from '../common/types/order-field.accessors';
import { ChangeableValue, OrderSpecs } from '../common/types/order-field.types';
import { DiffEntryDto, DiffResponseDto } from './dto/diff.dto';
import { HistoryEntryDto } from './dto/history-entry.dto';
import { SnapshotStateDto } from './dto/snapshot-state.dto';
import { VersionChangeLogDto } from './dto/version-change-log.dto';
import { OrderChangeLog } from './entities/order-change-log.entity';
import { PurchaseOrderSnapshot } from './entities/purchase-order-snapshot.entity';
import { SnapshotService } from './snapshot.service';

/** diff 비교 대상 필드(전체 변경 가능 필드). */
const DIFF_FIELDS: readonly ChangeableField[] = Object.values(ChangeableField);

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(PurchaseOrderSnapshot)
    private readonly snapshotRepo: Repository<PurchaseOrderSnapshot>,
    @InjectRepository(OrderChangeLog)
    private readonly changeLogRepo: Repository<OrderChangeLog>,
    @InjectRepository(ChangeRequest)
    private readonly changeRequestRepo: Repository<ChangeRequest>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly snapshotService: SnapshotService,
  ) {}

  /**
   * 변경 이력(시간순) + 전체 개수. 기본은 승인되어 버전이 생긴 변경만.
   * includeStatuses 로 거절(REJECTED)/대기(PENDING) 변경요청을 타임라인에 병합한다
   * (이들은 발주서에 반영되지 않으므로 version/state 없이 표시).
   *
   * 스냅샷/델타/변경요청을 한 타임라인으로 병합·정렬한 뒤 limit/offset 으로 잘라 반환한다.
   * total 은 자른 전과 동일(전체 타임라인 길이).
   *
   * PROD-NOTE: 병합·정렬을 메모리에서 한 뒤 slice 하므로, 한 발주서의 이력이 매우 커지면
   * 전 구간을 메모리로 적재하는 비용이 든다. 평가 범위(발주서당 이력 규모 작음)에선 충분하나,
   * 실서비스에서 대규모면 UNION 쿼리 + DB 레벨 LIMIT/OFFSET 으로 옮겨야 한다.
   */
  async getHistory(
    orderId: number,
    includeStatuses: ChangeRequestStatus[] = [],
    limit?: number,
    offset = 0,
  ): Promise<[HistoryEntryDto[], number]> {
    const snapshots = await this.snapshotRepo.find({
      where: { orderId },
      order: { version: 'ASC' },
    });
    if (snapshots.length === 0) {
      throw new NotFoundException(ERROR_MESSAGES.ORDER_NOT_FOUND);
    }
    const logs = await this.changeLogRepo.find({
      where: { orderId },
      order: { version: 'ASC', id: 'ASC' },
    });
    const logsByVersion = this.groupLogsByVersion(logs);
    const entries = snapshots.map((s) =>
      HistoryEntryDto.build(s, logsByVersion.get(s.version) ?? []),
    );

    if (includeStatuses.length > 0) {
      const requests = await this.changeRequestRepo.find({
        where: { orderId, status: In(includeStatuses) },
        relations: { items: true },
      });
      for (const cr of requests) {
        // 변경요청 발생 시점(occurredAt)에 유효했던 스냅샷을 찾아 state·oldValue 의 기준으로 넘긴다.
        const at = HistoryEntryDto.occurredAtOf(cr);
        entries.push(
          HistoryEntryDto.fromChangeRequest(
            cr,
            this.findSnapshotAt(snapshots, at),
          ),
        );
      }
      // 버전(validFrom)과 변경요청(검토/생성 시각)을 한 타임라인으로 정렬.
      entries.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    }

    const total = entries.length;
    const page =
      limit === undefined
        ? entries.slice(offset)
        : entries.slice(offset, offset + limit);
    return [page, total];
  }

  /** 특정 버전에서 반영된 변경 이력(델타). 해당 버전 없으면 404. */
  async getVersionChanges(
    orderId: number,
    version: number,
  ): Promise<VersionChangeLogDto> {
    const exists = await this.snapshotRepo.exists({
      where: { orderId, version },
    });
    if (!exists) {
      throw new NotFoundException(ERROR_MESSAGES.VERSION_NOT_FOUND);
    }
    const logs = await this.changeLogRepo.find({
      where: { orderId, version },
      order: { id: 'ASC' },
    });
    return VersionChangeLogDto.build(version, logs);
  }

  /** 특정 버전 상태. 없으면 404. */
  async getVersion(
    orderId: number,
    version: number,
  ): Promise<SnapshotStateDto> {
    const snapshot = await this.snapshotRepo.findOne({
      where: { orderId, version },
    });
    if (!snapshot) {
      throw new NotFoundException(ERROR_MESSAGES.VERSION_NOT_FOUND);
    }
    return SnapshotStateDto.fromEntity(snapshot);
  }

  /**
   * 특정 시점 상태. 유효 구간 [valid_from, valid_to) 반열림으로 한 행을 찾는다.
   * t < 최초 valid_from 이면 결과 없음 → 404.
   *
   * 값(수량/납기/사양 등)은 스냅샷에서 가져오되, status 는 스냅샷의 고정값이 아니라
   * order_status_history 의 그 시점 유효 상태로 보정한다(상태 전이는 새 스냅샷을 만들지 않으므로).
   */
  async getAt(orderId: number, timestamp: Date): Promise<SnapshotStateDto> {
    const snapshot = await this.snapshotRepo
      .createQueryBuilder('s')
      .where('s.order_id = :orderId', { orderId })
      .andWhere('s.valid_from <= :t', { t: timestamp })
      .andWhere('(s.valid_to IS NULL OR s.valid_to > :t)', { t: timestamp })
      .orderBy('s.version', 'DESC')
      .getOne();
    if (!snapshot) {
      throw new NotFoundException(ERROR_MESSAGES.SNAPSHOT_NOT_FOUND_AT_TIME);
    }
    const dto = SnapshotStateDto.fromEntity(snapshot);
    const statusAt = await this.snapshotService.getStatusAt(
      this.dataSource.manager,
      orderId,
      timestamp,
    );
    if (statusAt !== null) {
      dto.status = statusAt;
    }
    return dto;
  }

  /**
   * 두 버전 비교. 하나라도 없으면 404(비교 불가).
   * 두 스냅샷의 필드를 직접 비교해 달라진 항목만 반환한다.
   */
  async diff(
    orderId: number,
    fromVersion: number,
    toVersion: number,
  ): Promise<DiffResponseDto> {
    const [from, to] = await Promise.all([
      this.snapshotRepo.findOne({ where: { orderId, version: fromVersion } }),
      this.snapshotRepo.findOne({ where: { orderId, version: toVersion } }),
    ]);
    if (!from || !to) {
      throw new NotFoundException(ERROR_MESSAGES.VERSION_NOT_FOUND);
    }

    const differences: DiffEntryDto[] = [];
    for (const field of DIFF_FIELDS) {
      if (field === ChangeableField.SPECS) {
        // specs 는 키 단위로 펼쳐 비교한다(어떤 사양 키가 바뀌었는지 감사).
        differences.push(...this.diffSpecs(from.specs, to.specs));
        continue;
      }
      const fromValue = this.readSnapshotField(from, field);
      const toValue = this.readSnapshotField(to, field);
      if (!valuesEqual(fromValue, toValue)) {
        differences.push({ field, path: null, from: fromValue, to: toValue });
      }
    }

    const result = new DiffResponseDto();
    result.fromVersion = fromVersion;
    result.toVersion = toVersion;
    result.differences = differences;
    return result;
  }

  private groupLogsByVersion(
    logs: OrderChangeLog[],
  ): Map<number, OrderChangeLog[]> {
    const map = new Map<number, OrderChangeLog[]>();
    for (const log of logs) {
      const bucket = map.get(log.version) ?? [];
      bucket.push(log);
      map.set(log.version, bucket);
    }
    return map;
  }

  /**
   * 주어진 시점(at)에 유효했던 스냅샷을 찾는다.
   * 미반영 변경요청(PENDING/REJECTED)의 state·oldValue 를 그 시점 기준으로 채우는 데 쓴다.
   *
   * 스냅샷 구간은 [valid_from, valid_to) 반열림이므로,
   * valid_from <= at < valid_to(또는 valid_to=null) 인 스냅샷이 그 시점의 상태다.
   * 시점이 최초 생성 이전이면 해당 스냅샷이 없어 null.
   */
  private findSnapshotAt(
    snapshots: PurchaseOrderSnapshot[],
    at: Date,
  ): PurchaseOrderSnapshot | null {
    return (
      snapshots.find(
        (s) =>
          s.validFrom.getTime() <= at.getTime() &&
          (s.validTo === null || s.validTo.getTime() > at.getTime()),
      ) ?? null
    );
  }

  private readSnapshotField(
    snapshot: PurchaseOrderSnapshot,
    field: ChangeableField,
  ): ChangeableValue {
    // specs 는 키 단위 diff(diffSpecs)에서 별도로 처리하므로 여기선 전체 객체를 반환.
    if (field === ChangeableField.SPECS) {
      return snapshot.specs;
    }
    return FIELD_ACCESSORS[field].get(snapshot);
  }

  /**
   * 두 사양(specs) 객체를 키 단위로 비교한다.
   * 양쪽 키 합집합을 순회해 값이 다른 키만 DiffEntryDto(field=specs, path=키)로 만든다.
   * 한쪽에만 있는 키는 없는 쪽을 null 로 표기(키 추가/삭제도 차이로 노출).
   */
  private diffSpecs(
    fromSpecs: OrderSpecs,
    toSpecs: OrderSpecs,
  ): DiffEntryDto[] {
    const keys = new Set([
      ...Object.keys(fromSpecs ?? {}),
      ...Object.keys(toSpecs ?? {}),
    ]);
    const diffs: DiffEntryDto[] = [];
    for (const key of keys) {
      const fromValue = fromSpecs?.[key] ?? null;
      const toValue = toSpecs?.[key] ?? null;
      if (fromValue !== toValue) {
        diffs.push({
          field: ChangeableField.SPECS,
          path: key,
          from: fromValue,
          to: toValue,
        });
      }
    }
    return diffs;
  }
}
