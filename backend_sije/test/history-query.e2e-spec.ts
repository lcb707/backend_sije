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
  SOURCING,
} from './support/fixtures';

const T_V1 = new Date('2025-02-10T00:00:00.000Z');
const T_V2 = new Date('2025-02-15T00:00:00.000Z');

async function approve(app: INestApplication, crId: number): Promise<void> {
  await request(app.getHttpServer())
    .post(`/change-requests/${crId}/approve`)
    .set(SOURCING)
    .send({ reviewComment: '승인' })
    .expect(200);
}

/** v1(T_V1, 1000벌) → v2(T_V2, 1500벌) 상태의 발주서를 만든다. */
async function seedTwoVersions(
  app: INestApplication,
  ctx: TestContext,
): Promise<number> {
  ctx.clock.set(T_V1);
  const orderId = await createOrder(app);
  await confirmOrder(app, orderId);
  ctx.clock.set(T_V2);
  const crId = await createChangeRequest(app, orderId, [
    { field: 'quantity', newValue: 1500 },
  ]);
  await approve(app, crId);
  return orderId;
}

describe('이력 조회 (§11 B)', () => {
  let ctx: TestContext;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await createTestApp(T_V1);
    app = ctx.app;
  });
  afterAll(async () => {
    await closeTestApp(ctx);
  });
  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
    ctx.clock.set(T_V1);
  });

  it('B1: 특정 버전(v1) 조회는 그 시점 값을 반환한다', async () => {
    const orderId = await seedTwoVersions(app, ctx);
    const v1 = await request(app.getHttpServer())
      .get(`/orders/${orderId}/versions/1`)
      .set(BUYER)
      .expect(200);
    expect(v1.body.quantity).toBe(1000);
  });

  it('B2: 시점 조회 — 2025-02-16 은 v2(1500) 를 반환한다', async () => {
    const orderId = await seedTwoVersions(app, ctx);
    const at = await request(app.getHttpServer())
      .get(`/orders/${orderId}/at`)
      .set(BUYER)
      .query({ timestamp: '2025-02-16T00:00:00.000Z' })
      .expect(200);
    expect(at.body.version).toBe(2);
    expect(at.body.quantity).toBe(1500);
  });

  it('B2-경계: valid_from 과 정확히 같은 시각은 그 버전에 포함된다([from, to) 반열림)', async () => {
    const orderId = await seedTwoVersions(app, ctx);
    // v2 의 valid_from == T_V2. 그 시각 자체는 v2.
    const atExact = await request(app.getHttpServer())
      .get(`/orders/${orderId}/at`)
      .set(BUYER)
      .query({ timestamp: T_V2.toISOString() })
      .expect(200);
    expect(atExact.body.version).toBe(2);

    // v2 시작 1ms 전은 여전히 v1.
    const justBefore = new Date(T_V2.getTime() - 1).toISOString();
    const atBefore = await request(app.getHttpServer())
      .get(`/orders/${orderId}/at`)
      .set(BUYER)
      .query({ timestamp: justBefore })
      .expect(200);
    expect(atBefore.body.version).toBe(1);
  });

  it('B3: 존재하지 않는 버전 조회는 404', async () => {
    const orderId = await seedTwoVersions(app, ctx);
    await request(app.getHttpServer())
      .get(`/orders/${orderId}/versions/99`)
      .set(BUYER)
      .expect(404);
  });

  it('B4: 최초 valid_from 이전 시점 조회는 404', async () => {
    const orderId = await seedTwoVersions(app, ctx);
    await request(app.getHttpServer())
      .get(`/orders/${orderId}/at`)
      .set(BUYER)
      .query({ timestamp: '2025-01-01T00:00:00.000Z' })
      .expect(404);
  });
});
