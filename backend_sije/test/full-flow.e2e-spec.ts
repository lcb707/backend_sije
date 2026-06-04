import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ChangeRequestStatus } from '../src/common/enums/change-request-status.enum';
import { OrderStatus } from '../src/common/enums/order-status.enum';
import { closeTestApp, createTestApp, TestContext } from './support/test-app';
import { BUYER, SOURCING } from './support/fixtures';

/**
 *  통합 e2e.
 *  v1(2025-02-10): 티셔츠 1000벌, 납기 2025-03-15
 *  v2(2025-02-15): 1500벌
 *  v3(2025-02-20): 납기 2025-03-25
 * 검증: v2 조회, 2025-02-16 시점 조회, v1 vs v3 diff, 이력.
 */
const T_V1 = new Date('2025-02-10T00:00:00.000Z');
const T_V2 = new Date('2025-02-15T00:00:00.000Z');
const T_V3 = new Date('2025-02-20T00:00:00.000Z');

describe('발주서 변경 승인 전체 플로우 (e2e)', () => {
  let ctx: TestContext;
  let app: INestApplication;

  beforeEach(async () => {
    ctx = await createTestApp(T_V1);
    app = ctx.app;
  });

  afterEach(async () => {
    await closeTestApp(ctx);
  });

  it('생성→확정→승인2회→버전/시점/비교/이력 조회가 정상 동작한다', async () => {
    const server = app.getHttpServer();

    // 1) 발주서 생성 (v1, 2025-02-10)
    const created = await request(server)
      .post('/orders')
      .set(BUYER)
      .send({
        productName: '티셔츠',
        quantity: 1000,
        unitPrice: 5000,
        specs: { color: 'white', size: 'L' },
        dueDate: '2025-03-15',
      })
      .expect(201);
    const orderId = created.body.id;
    expect(created.body.currentVersion).toBe(1);
    expect(created.body.status).toBe(OrderStatus.DRAFT);

    // 2) 제출(BUYER) → 확정(SOURCING)
    await request(server)
      .patch(`/orders/${orderId}/status`)
      .set(BUYER)
      .send({ status: OrderStatus.PENDING })
      .expect(200);
    await request(server)
      .patch(`/orders/${orderId}/status`)
      .set(SOURCING)
      .send({ status: OrderStatus.CONFIRMED })
      .expect(200);

    // 3) 변경요청1: 수량 1500 → 승인 (v2, 2025-02-15)
    ctx.clock.set(T_V2);
    const cr1 = await request(server)
      .post(`/orders/${orderId}/change-requests`)
      .set(BUYER)
      .send({
        reason: '고객사 추가 주문',
        items: [{ field: 'quantity', newValue: 1500 }],
      })
      .expect(201);
    const approved1 = await request(server)
      .post(`/change-requests/${cr1.body.id}/approve`)
      .set(SOURCING)
      .send({ reviewComment: '재고 확인 완료' })
      .expect(200);
    expect(approved1.body.status).toBe(ChangeRequestStatus.APPROVED);
    expect(approved1.body.resultingVersion).toBe(2);

    // 4) 변경요청2: 납기 2025-03-25 → 승인 (v3, 2025-02-20)
    ctx.clock.set(T_V3);
    const cr2 = await request(server)
      .post(`/orders/${orderId}/change-requests`)
      .set(BUYER)
      .send({
        reason: '납기 연장 요청',
        items: [{ field: 'dueDate', newValue: '2025-03-25' }],
      })
      .expect(201);
    await request(server)
      .post(`/change-requests/${cr2.body.id}/approve`)
      .set(SOURCING)
      .send({ reviewComment: '생산 일정 조정 가능' })
      .expect(200);

    // 5) 버전2 조회 → 1500벌, 2025-03-15
    const v2 = await request(server)
      .get(`/orders/${orderId}/versions/2`)
      .set(BUYER)
      .expect(200);
    expect(v2.body.quantity).toBe(1500);
    expect(v2.body.dueDate).toBe('2025-03-15');

    // 6) 2025-02-16 시점 조회 → 버전2 상태(1500, 2025-03-15)
    const at = await request(server)
      .get(`/orders/${orderId}/at`)
      .set(BUYER)
      .query({ timestamp: '2025-02-16T00:00:00.000Z' })
      .expect(200);
    expect(at.body.version).toBe(2);
    expect(at.body.quantity).toBe(1500);
    expect(at.body.dueDate).toBe('2025-03-15');

    // 7) v1 vs v3 비교 → 수량 1000→1500, 납기 03-15→03-25
    const diff = await request(server)
      .get(`/orders/${orderId}/diff`)
      .set(BUYER)
      .query({ from: 1, to: 3 })
      .expect(200);
    const byField: Record<string, { from: unknown; to: unknown }> = {};
    for (const d of diff.body.differences) {
      byField[d.field] = { from: d.from, to: d.to };
    }
    expect(byField.quantity).toEqual({ from: 1000, to: 1500 });
    expect(byField.dueDate).toEqual({ from: '2025-03-15', to: '2025-03-25' });
    expect(diff.body.differences).toHaveLength(2);

    // 8) 이력 조회 → 3개 버전, 시간순, 델타 포함
    const history = await request(server)
      .get(`/orders/${orderId}/history`)
      .set(BUYER)
      .expect(200);
    expect(history.body.total).toBe(3);
    expect(history.body.items).toHaveLength(3);
    expect(history.body.items[0].version).toBe(1);
    expect(history.body.items[0].changes).toHaveLength(0);
    expect(history.body.items[1].changes[0].field).toBe('quantity');
    expect(history.body.items[1].changes[0].oldValue).toBe(1000);
    expect(history.body.items[1].changes[0].newValue).toBe(1500);
    expect(history.body.items[2].changes[0].field).toBe('dueDate');
  });
});
