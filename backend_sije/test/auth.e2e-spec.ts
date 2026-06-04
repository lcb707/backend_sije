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

describe('인증·인가 (로그인/역할 식별)', () => {
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

  // --- 인증(authentication): 실제 보호된 API 로 검증 ---
  it('X-User-Id 헤더가 없으면 401', async () => {
    const orderId = await createOrder(app);
    await request(app.getHttpServer()).get(`/orders/${orderId}`).expect(401);
  });

  it('등록되지 않은 사용자면 401', async () => {
    const orderId = await createOrder(app);
    await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set({ 'X-User-Id': 'ghost' })
      .expect(401);
  });

  // --- 인가(authorization) ---
  it('BUYER 가 승인(SOURCING 전용)을 시도하면 403', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    const crId = await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1500 },
    ]);
    await request(app.getHttpServer())
      .post(`/change-requests/${crId}/approve`)
      .set(BUYER)
      .send({ reviewComment: '시도' })
      .expect(403);
  });

  it('MANUFACTURER 가 발주서 생성(BUYER 전용)을 시도하면 403', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .set(MANUFACTURER)
      .send({
        productName: 'x',
        quantity: 1,
        unitPrice: 0,
        specs: {},
        dueDate: '2025-03-15',
      })
      .expect(403);
  });

  it('MANUFACTURER 도 조회는 가능하다', async () => {
    const orderId = await createOrder(app);
    await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set(MANUFACTURER)
      .expect(200);
  });

  // --- 감사 정합성: 주체가 시드 계정에 묶인다 ---
  it('요청자/검토자가 실제 로그인 계정으로 기록된다(다른 사람 처리)', async () => {
    const orderId = await createOrder(app); // buyer1 생성
    await confirmOrder(app, orderId);
    const crId = await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1500 },
    ]); // buyer1 요청

    const approved = await request(app.getHttpServer())
      .post(`/change-requests/${crId}/approve`)
      .set(SOURCING) // sourcing1 승인
      .send({ reviewComment: '승인' })
      .expect(200);

    expect(approved.body.requestedBy).toBe('buyer1');
    expect(approved.body.reviewedBy).toBe('sourcing1');
  });
});
