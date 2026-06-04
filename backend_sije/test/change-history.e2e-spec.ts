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

const T0 = new Date('2025-02-10T00:00:00.000Z');

async function approve(
  app: INestApplication,
  crId: number,
): Promise<request.Response> {
  return request(app.getHttpServer())
    .post(`/change-requests/${crId}/approve`)
    .set(SOURCING)
    .send({ reviewComment: '승인' })
    .expect(200);
}

describe('변경 저장 + 비교 (§11 A, C)', () => {
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

  // A2: 여러 필드 동시 변경이 하나의 버전으로 저장된다.
  it('A2: 한 변경요청의 여러 필드 변경이 하나의 버전(v2)으로 저장된다', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);

    const crId = await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1500 },
      { field: 'dueDate', newValue: '2025-03-25' },
    ]);
    const approved = await approve(app, crId);
    expect(approved.body.resultingVersion).toBe(2);

    // 스냅샷은 v2 한 행, 델타는 두 필드 모두 version=2.
    const v2 = await request(app.getHttpServer())
      .get(`/orders/${orderId}/versions/2`)
      .set(BUYER)
      .expect(200);
    expect(v2.body.quantity).toBe(1500);
    expect(v2.body.dueDate).toBe('2025-03-25');

    const history = await request(app.getHttpServer())
      .get(`/orders/${orderId}/history`)
      .set(BUYER)
      .expect(200);
    expect(history.body.items).toHaveLength(2); // v1, v2
    const v2Changes = history.body.items[1].changes;
    expect(v2Changes).toHaveLength(2);
    expect(
      v2Changes.every((c: { field: string }) =>
        ['quantity', 'dueDate'].includes(c.field),
      ),
    ).toBe(true);
  });

  // A1: 승인 시 발주서 본체가 갱신되고 이력이 저장된다(변경 없는 필드는 델타 제외).
  it('A1: 값이 실제로 바뀐 필드만 델타로 기록된다(동일 값 항목 제외)', async () => {
    const orderId = await createOrder(app); // quantity=1000
    await confirmOrder(app, orderId);

    // quantity 는 1000 그대로, dueDate 만 변경 → 델타는 dueDate 1개만.
    const crId = await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1000 },
      { field: 'dueDate', newValue: '2025-04-01' },
    ]);
    await approve(app, crId);

    const history = await request(app.getHttpServer())
      .get(`/orders/${orderId}/history`)
      .set(BUYER)
      .expect(200);
    const v2Changes = history.body.items[1].changes;
    expect(v2Changes).toHaveLength(1);
    expect(v2Changes[0].field).toBe('dueDate');
  });

  // C2: 동일 버전 비교 → 빈 배열.
  it('C2: 동일 버전 비교는 빈 차이를 반환한다', async () => {
    const orderId = await createOrder(app);
    const diff = await request(app.getHttpServer())
      .get(`/orders/${orderId}/diff`)
      .set(BUYER)
      .query({ from: 1, to: 1 })
      .expect(200);
    expect(diff.body.differences).toHaveLength(0);
  });

  // C1 보강: specs 변경은 diff 에 키 단위로 잡힌다(바뀐 키만).
  it('C1: specs 변경이 diff 에 키 단위로 반영된다', async () => {
    const orderId = await createOrder(app); // specs={color:white,size:L}
    await confirmOrder(app, orderId);
    // color 만 바뀌도록 specs 전체를 교체(size 는 동일).
    const crId = await createChangeRequest(app, orderId, [
      { field: 'specs', newValue: { color: 'black', size: 'L' } },
    ]);
    await approve(app, crId);

    const diff = await request(app.getHttpServer())
      .get(`/orders/${orderId}/diff`)
      .set(BUYER)
      .query({ from: 1, to: 2 })
      .expect(200);
    // size 는 동일하므로 color 키 하나만 차이로 나온다.
    expect(diff.body.differences).toHaveLength(1);
    expect(diff.body.differences[0]).toMatchObject({
      field: 'specs',
      path: 'color',
      from: 'white',
      to: 'black',
    });
  });
});
