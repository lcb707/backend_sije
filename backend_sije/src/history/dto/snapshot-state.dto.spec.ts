import { OrderStatus } from '../../common/enums/order-status.enum';
import { PurchaseOrderSnapshot } from '../entities/purchase-order-snapshot.entity';
import { SnapshotStateDto } from './snapshot-state.dto';

/**
 * SnapshotStateDto.fromEntity 의 수작업 매핑이 누락 없이 동작하는지 검증한다.
 *
 * 수작업 매핑은 가독성이 좋지만, 엔티티에 필드를 추가하고 매핑에 반영하지 않으면
 * 컴파일은 통과한 채 응답에서 그 필드만 조용히 사라진다(ARCHITECTURE.md §5 개선).
 * 이 테스트가 "엔티티의 모든 도메인 필드 → DTO" 매핑을 강제해 그 누락을 빨간불로 잡는다.
 */
describe('SnapshotStateDto.fromEntity', () => {
  function buildSnapshot(): PurchaseOrderSnapshot {
    const snapshot = new PurchaseOrderSnapshot();
    snapshot.id = 42;
    snapshot.orderId = 7;
    snapshot.version = 3;
    snapshot.productName = '면 티셔츠';
    snapshot.quantity = 1500;
    snapshot.unitPrice = 5000;
    snapshot.specs = { color: 'white', size: 'L' };
    snapshot.dueDate = '2025-03-25';
    snapshot.status = OrderStatus.IN_PRODUCTION;
    snapshot.validFrom = new Date('2025-02-16T00:00:00.000Z');
    snapshot.validTo = new Date('2025-03-01T00:00:00.000Z');
    snapshot.changeRequestId = 11;
    snapshot.createdAt = new Date('2025-02-16T00:00:00.000Z');
    return snapshot;
  }

  it('스냅샷의 모든 도메인 필드 값을 그대로 매핑한다', () => {
    const snapshot = buildSnapshot();

    const dto = SnapshotStateDto.fromEntity(snapshot);

    expect(dto).toBeInstanceOf(SnapshotStateDto);
    expect(dto).toEqual({
      orderId: 7,
      version: 3,
      productName: '면 티셔츠',
      quantity: 1500,
      unitPrice: 5000,
      specs: { color: 'white', size: 'L' },
      dueDate: '2025-03-25',
      status: OrderStatus.IN_PRODUCTION,
      validFrom: new Date('2025-02-16T00:00:00.000Z'),
      validTo: new Date('2025-03-01T00:00:00.000Z'),
    });
  });

  it('validTo 가 null(최신 버전)인 경우도 매핑한다', () => {
    const snapshot = buildSnapshot();
    snapshot.validTo = null;

    const dto = SnapshotStateDto.fromEntity(snapshot);

    expect(dto.validTo).toBeNull();
  });

  it('엔티티의 모든 도메인 필드가 DTO 에 반영된다(누락 방지)', () => {
    const snapshot = buildSnapshot();
    const dto = SnapshotStateDto.fromEntity(snapshot);

    // 응답에 노출하지 않는 영속성/메타 컬럼은 매핑 대상에서 제외한다.
    const PERSISTENCE_ONLY_KEYS = new Set<keyof PurchaseOrderSnapshot>([
      'id',
      'changeRequestId',
      'createdAt',
    ]);

    const expectedDomainKeys = Object.keys(snapshot).filter(
      (key) => !PERSISTENCE_ONLY_KEYS.has(key as keyof PurchaseOrderSnapshot),
    );

    // 도메인 키가 빠짐없이 DTO 에 존재해야 한다.
    for (const key of expectedDomainKeys) {
      expect(dto).toHaveProperty(key);
    }
    // 반대로 DTO 에 영속성 전용 컬럼이 새지 않아야 한다.
    for (const key of PERSISTENCE_ONLY_KEYS) {
      expect(dto).not.toHaveProperty(key);
    }
  });
});
