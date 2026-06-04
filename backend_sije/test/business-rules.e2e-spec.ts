import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  closeTestApp,
  createTestApp,
  TestContext,
  truncateAll,
} from './support/test-app';
import {
  BUYER,
  confirmOrder,
  createChangeRequest,
  createOrder,
  MANUFACTURER,
  SOURCING,
} from './support/fixtures';

const T0 = new Date('2025-02-10T00:00:00.000Z');

describe('비즈니스 규칙 위반 (§11 D)', () => {
  let ctx: TestContext;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await createTestApp(T0);
    app = ctx.app;
  });
  afterAll(async () => {
    await closeTestApp(ctx);
  });
  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
    ctx.clock.set(T0);
  });

  it('D1: BUYER 가 아닌 역할의 변경요청 생성은 403', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/change-requests`)
      .set(SOURCING)
      .send({ reason: 'x', items: [{ field: 'quantity', newValue: 1500 }] })
      .expect(403);
  });

  it('D2: CONFIRMED 미만(DRAFT) 상태에서 변경요청은 409', async () => {
    const orderId = await createOrder(app); // DRAFT
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/change-requests`)
      .set(BUYER)
      .send({ reason: 'x', items: [{ field: 'quantity', newValue: 1500 }] })
      .expect(409);
  });

  it('D3: PENDING 변경요청이 있으면 신규 생성은 409', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1500 },
    ]);
    // 두 번째 생성 시도 → 409
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/change-requests`)
      .set(BUYER)
      .send({ reason: 'y', items: [{ field: 'quantity', newValue: 2000 }] })
      .expect(409);
  });

  it('D4: SOURCING 이 아닌 역할의 승인은 403', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    const crId = await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1500 },
    ]);
    await request(app.getHttpServer())
      .post(`/change-requests/${crId}/approve`)
      .set(MANUFACTURER)
      .send({ reviewComment: '시도' })
      .expect(403);
  });

  it('D5: 이미 처리된(비-PENDING) 변경요청 재승인은 409', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    const crId = await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1500 },
    ]);
    await request(app.getHttpServer())
      .post(`/change-requests/${crId}/approve`)
      .set(SOURCING)
      .send({ reviewComment: '승인' })
      .expect(200);
    // 다시 승인 시도 → 409
    await request(app.getHttpServer())
      .post(`/change-requests/${crId}/approve`)
      .set(SOURCING)
      .send({ reviewComment: '재승인' })
      .expect(409);
  });

  it('D6: 변경 항목 0개는 400(검증 실패)', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/change-requests`)
      .set(BUYER)
      .send({ reason: 'x', items: [] })
      .expect(400);
  });

  it('D7: 반려 시 발주서·버전이 불변이다', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    const crId = await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1500 },
    ]);
    await request(app.getHttpServer())
      .post(`/change-requests/${crId}/reject`)
      .set(SOURCING)
      .send({ reviewComment: '반려 사유' })
      .expect(200);

    const order = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set(BUYER)
      .expect(200);
    expect(order.body.quantity).toBe(1000); // 불변
    expect(order.body.currentVersion).toBe(1); // 새 버전 없음

    // 반려 후에는 PENDING 이 없으므로 신규 생성 가능(중복 규칙 해제 확인).
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/change-requests`)
      .set(BUYER)
      .send({
        reason: '재시도',
        items: [{ field: 'quantity', newValue: 1200 }],
      })
      .expect(201);
  });

  it('D-추가: 잘못된 상태 전이(DRAFT→CONFIRMED 직행)는 409', async () => {
    const orderId = await createOrder(app);
    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set(SOURCING)
      .send({ status: 'CONFIRMED' })
      .expect(409);
  });

  it('목록 조회: GET /orders 가 생성된 발주서를 최신순으로 반환한다', async () => {
    const first = await createOrder(app);
    const second = await createOrder(app);
    const res = await request(app.getHttpServer())
      .get('/orders')
      .set(BUYER)
      .expect(200);
    // 페이지네이션 봉투: { items, total, limit, offset }
    expect(res.body.total).toBe(2);
    expect(res.body.items).toHaveLength(2);
    // 최신순(id DESC): 두 번째 생성분이 먼저
    expect(res.body.items[0].id).toBe(second);
    expect(res.body.items[1].id).toBe(first);
  });

  it('목록 조회: GET /orders 가 limit/offset 페이지네이션을 적용한다', async () => {
    const first = await createOrder(app);
    const second = await createOrder(app);
    const third = await createOrder(app);
    // limit=1, offset=1 → 최신순에서 두 번째(=second)만.
    const res = await request(app.getHttpServer())
      .get('/orders')
      .query({ limit: 1, offset: 1 })
      .set(BUYER)
      .expect(200);
    expect(res.body.total).toBe(3);
    expect(res.body.limit).toBe(1);
    expect(res.body.offset).toBe(1);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe(second);
    expect([first, third]).not.toContain(res.body.items[0].id);
  });
});
