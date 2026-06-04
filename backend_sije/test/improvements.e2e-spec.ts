import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OrderStatus } from '../src/common/enums/order-status.enum';
import {
  BUYER,
  confirmOrder,
  createChangeRequest,
  createOrder,
  SOURCING,
} from './support/fixtures';
import {
  closeTestApp,
  createTestApp,
  TestContext,
  truncateAll,
} from './support/test-app';

const T_V1 = new Date('2025-02-10T00:00:00.000Z');
const T_V2 = new Date('2025-02-15T00:00:00.000Z');

async function approve(
  app: INestApplication,
  crId: number,
  expected = 200,
): Promise<request.Response> {
  return request(app.getHttpServer())
    .post(`/change-requests/${crId}/approve`)
    .set(SOURCING)
    .send({ reviewComment: '승인' })
    .expect(expected);
}

async function setStatus(
  app: INestApplication,
  orderId: number,
  status: OrderStatus,
  headers: Record<string, string>,
): Promise<void> {
  await request(app.getHttpServer())
    .patch(`/orders/${orderId}/status`)
    .set(headers)
    .send({ status })
    .expect(200);
}

describe('개선 항목 (2/3/4/10)', () => {
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

  // ── 10. 실질 변경 없는 승인은 422, 버전 불변 ──
  it('10: 모든 항목이 기존값과 같은 변경요청 승인은 422, 버전은 그대로', async () => {
    const orderId = await createOrder(app); // quantity 1000
    await confirmOrder(app, orderId);
    const crId = await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1000 }, // 동일값
    ]);
    await approve(app, crId, 422);

    const order = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set(BUYER)
      .expect(200);
    expect(order.body.currentVersion).toBe(1);
    // 변경요청은 여전히 PENDING (거부했으므로 상태 불변).
    const cr = await request(app.getHttpServer())
      .get(`/orders/${orderId}/change-requests`)
      .set(BUYER)
      .expect(200);
    expect(cr.body.items[0].status).toBe('PENDING');
  });

  // ── 3. 버전별 변경 이력 API ──
  it('3-a: 특정 버전의 변경 이력(델타) 조회', async () => {
    ctx.clock.set(T_V1);
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    ctx.clock.set(T_V2);
    const crId = await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1500 },
    ]);
    await approve(app, crId);

    const v2changes = await request(app.getHttpServer())
      .get(`/orders/${orderId}/versions/2/changes`)
      .set(BUYER)
      .expect(200);
    expect(v2changes.body.version).toBe(2);
    expect(v2changes.body.changes).toHaveLength(1);
    expect(v2changes.body.changes[0].field).toBe('quantity');
    expect(v2changes.body.changes[0].oldValue).toBe(1000);
    expect(v2changes.body.changes[0].newValue).toBe(1500);

    // 버전1(생성)은 빈 델타.
    const v1changes = await request(app.getHttpServer())
      .get(`/orders/${orderId}/versions/1/changes`)
      .set(BUYER)
      .expect(200);
    expect(v1changes.body.changes).toHaveLength(0);

    // 없는 버전은 404.
    await request(app.getHttpServer())
      .get(`/orders/${orderId}/versions/99/changes`)
      .set(BUYER)
      .expect(404);
  });

  // ── 3. 이력에 거절/대기 변경요청 포함 ──
  it('3-b: includeRejected/includePending 로 미반영 변경요청을 이력에 포함', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    // 거절될 변경요청.
    const rejectedCr = await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 2000 },
    ]);
    await request(app.getHttpServer())
      .post(`/change-requests/${rejectedCr}/reject`)
      .set(SOURCING)
      .send({ reviewComment: '반려' })
      .expect(200);
    // 대기 중 변경요청.
    await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1200 },
    ]);

    // 기본: 승인된 버전만(버전1뿐).
    const base = await request(app.getHttpServer())
      .get(`/orders/${orderId}/history`)
      .set(BUYER)
      .expect(200);
    expect(
      base.body.items.every((e: { kind: string }) => e.kind === 'VERSION'),
    ).toBe(true);

    // includeRejected + includePending.
    const full = await request(app.getHttpServer())
      .get(`/orders/${orderId}/history`)
      .set(BUYER)
      .query({ includeRejected: true, includePending: true })
      .expect(200);
    const statuses = full.body.items
      .filter((e: { kind: string }) => e.kind === 'CHANGE_REQUEST')
      .map((e: { changeRequestStatus: string }) => e.changeRequestStatus);
    expect(statuses).toContain('REJECTED');
    expect(statuses).toContain('PENDING');
  });

  // ── 4. 완료 시 PENDING 자동 반려 ──
  it('4: COMPLETED 전이 시 미결 PENDING 변경요청은 자동 반려된다', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    await setStatus(app, orderId, OrderStatus.IN_PRODUCTION, SOURCING);
    // 생산 중 변경요청 생성(미결).
    await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1300 },
    ]);

    await setStatus(app, orderId, OrderStatus.COMPLETED, SOURCING);

    const cr = await request(app.getHttpServer())
      .get(`/orders/${orderId}/change-requests`)
      .set(BUYER)
      .expect(200);
    expect(cr.body.items[0].status).toBe('REJECTED');
    expect(cr.body.items[0].reviewComment).toContain('완료');
  });

  // ── 4. 완료된 발주서는 승인 불가(방어) ──
  it('4: 완료 직전에 만든 변경요청도 완료로 자동반려되어 승인 시 409/거부된다', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    await setStatus(app, orderId, OrderStatus.IN_PRODUCTION, SOURCING);
    const crId = await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1300 },
    ]);
    await setStatus(app, orderId, OrderStatus.COMPLETED, SOURCING);
    // 자동 반려되어 PENDING 이 아니므로 승인은 409(ONLY_PENDING).
    await approve(app, crId, 409);
  });

  // ── B. 완료된 발주서에는 변경요청 생성 불가 ──
  it('B: COMPLETED 발주서에 변경요청 생성 시 409', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    await setStatus(app, orderId, OrderStatus.IN_PRODUCTION, SOURCING);
    await setStatus(app, orderId, OrderStatus.COMPLETED, SOURCING);

    await request(app.getHttpServer())
      .post(`/orders/${orderId}/change-requests`)
      .set(BUYER)
      .send({
        reason: '완료 후 변경 시도',
        items: [{ field: 'quantity', newValue: 1500 }],
      })
      .expect(409);
  });

  // ── 8. specs path 단위 변경 ──
  it('8: specs.color 만 변경하면 다른 사양 키(size)는 보존된다', async () => {
    // 기본 specs = { color:'white', size:'L' }
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    const crId = await createChangeRequest(app, orderId, [
      { field: 'specs', path: 'color', newValue: 'black' },
    ]);
    await approve(app, crId);

    const v2 = await request(app.getHttpServer())
      .get(`/orders/${orderId}/versions/2`)
      .set(BUYER)
      .expect(200);
    expect(v2.body.specs).toEqual({ color: 'black', size: 'L' }); // size 보존

    // 델타가 path='color', white→black 으로 키 단위 기록되는지.
    const changes = await request(app.getHttpServer())
      .get(`/orders/${orderId}/versions/2/changes`)
      .set(BUYER)
      .expect(200);
    expect(changes.body.changes).toHaveLength(1);
    expect(changes.body.changes[0]).toMatchObject({
      field: 'specs',
      path: 'color',
      oldValue: 'white',
      newValue: 'black',
    });
  });

  it('8: specs path 변경의 diff 는 specs.color 키 단위로 표시된다', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    const crId = await createChangeRequest(app, orderId, [
      { field: 'specs', path: 'color', newValue: 'black' },
    ]);
    await approve(app, crId);

    const diff = await request(app.getHttpServer())
      .get(`/orders/${orderId}/diff`)
      .set(BUYER)
      .query({ from: 1, to: 2 })
      .expect(200);
    expect(diff.body.differences).toContainEqual({
      field: 'specs',
      path: 'color',
      from: 'white',
      to: 'black',
    });
  });

  it('8: path 는 specs 필드에서만 허용 — quantity 에 path 지정 시 400', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/change-requests`)
      .set(BUYER)
      .send({
        reason: '잘못된 path',
        items: [{ field: 'quantity', path: 'color', newValue: 1500 }],
      })
      .expect(400);
  });

  it('8: specs path 변경에 객체값을 주면 400 (path 있으면 스칼라여야 함)', async () => {
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/change-requests`)
      .set(BUYER)
      .send({
        reason: '잘못된 값 타입',
        items: [{ field: 'specs', path: 'color', newValue: { x: 1 } }],
      })
      .expect(400);
  });

  // ── 6. 미반영 변경요청(반려/대기) 이력의 oldValue·state 채움 ──
  it('6: 반려/대기 변경요청 이력은 그 시점 발주서값으로 oldValue 와 state 를 채운다', async () => {
    const orderId = await createOrder(app); // quantity 1000
    await confirmOrder(app, orderId);

    // 반려될 변경요청(1000 → 2000).
    const rejectedCr = await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 2000 },
    ]);
    await request(app.getHttpServer())
      .post(`/change-requests/${rejectedCr}/reject`)
      .set(SOURCING)
      .send({ reviewComment: '반려' })
      .expect(200);
    // 대기 변경요청(1000 → 1200).
    await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1200 },
    ]);

    const full = await request(app.getHttpServer())
      .get(`/orders/${orderId}/history`)
      .set(BUYER)
      .query({ includeRejected: true, includePending: true })
      .expect(200);

    const crEntries = full.body.items.filter(
      (e: { kind: string }) => e.kind === 'CHANGE_REQUEST',
    );
    for (const entry of crEntries) {
      // 버그 회귀 방지: oldValue 는 그 시점 발주서값(1000)으로 채워진다(null 금지).
      expect(entry.changes[0].oldValue).toBe(1000);
      // 미반영 항목도 그 시점 발주서 전체 상세를 state 로 제공한다.
      expect(entry.state).not.toBeNull();
      expect(entry.state.quantity).toBe(1000);
      expect(entry.state.productName).toBe('티셔츠');
    }
  });

  // ── 4. specs 키 제약: 기존 키만 변경 가능(미존재 키 422) ──
  it('4: 발주서에 없는 specs 키를 변경요청하면 422', async () => {
    const orderId = await createOrder(app); // specs={color,size}
    await confirmOrder(app, orderId);
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/change-requests`)
      .set(BUYER)
      .send({
        reason: '없는 사양 키 추가 시도',
        items: [{ field: 'specs', path: 'material', newValue: 'cotton' }],
      })
      .expect(422);
  });

  // ── 4. specs 키 제약: 허용 마스터(spec_keys)에 없는 키는 생성 거부(422) ──
  it('4: 허용 마스터에 없는 specs 키로 발주서를 생성하면 422', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .set(BUYER)
      .send({
        productName: '티셔츠',
        quantity: 1000,
        unitPrice: 5000,
        specs: { color: 'white', unknownKey: 'x' }, // unknownKey 는 마스터 미정의
        dueDate: '2025-03-15',
      })
      .expect(422);
  });

  it('4: 허용 마스터에 정의된 키(material)는 발주서 생성에 허용된다', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .set(BUYER)
      .send({
        productName: '티셔츠',
        quantity: 1000,
        unitPrice: 5000,
        specs: { color: 'white', material: 'cotton' },
        dueDate: '2025-03-15',
      })
      .expect(201);
  });

  // ── 2. 승인 시 상태 유지 + 상태 이력 구간 기록 ──
  it('2: 생산중 변경요청 승인은 상태를 IN_PRODUCTION 으로 유지하고 승인 시점을 상태 이력에 남긴다', async () => {
    ctx.clock.set(T_V1);
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);
    await setStatus(app, orderId, OrderStatus.IN_PRODUCTION, SOURCING);

    // 생산 중 변경요청 생성·승인(승인 시각 T_V2).
    ctx.clock.set(T_V2);
    const crId = await createChangeRequest(app, orderId, [
      { field: 'quantity', newValue: 1500 },
    ]);
    await approve(app, crId);

    // 발주서 상태는 그대로 IN_PRODUCTION(되돌리지 않음).
    const order = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set(BUYER)
      .expect(200);
    expect(order.body.status).toBe(OrderStatus.IN_PRODUCTION);

    // 승인 시점(T_V2) 직후 시점 조회 status 도 IN_PRODUCTION(승인이 상태를 바꾸지 않음).
    const atApproved = await request(app.getHttpServer())
      .get(`/orders/${orderId}/at`)
      .set(BUYER)
      .query({ timestamp: new Date(T_V2.getTime() + 1000).toISOString() })
      .expect(200);
    expect(atApproved.body.status).toBe(OrderStatus.IN_PRODUCTION);
    // 값은 새 버전(2)이 반영되어 1500.
    expect(atApproved.body.quantity).toBe(1500);
  });

  // ── 2. 상태 전이 이력 → 시점 조회 status 보정 ──
  it('2: 상태 전이 후 과거 시점 조회 status 가 그 시점 실제 상태와 일치', async () => {
    // T_V1 에 생성/확정(값 버전1, 상태 CONFIRMED).
    ctx.clock.set(T_V1);
    const orderId = await createOrder(app);
    await confirmOrder(app, orderId);

    // 이후 T_V2 에 생산 전이(새 값 버전은 안 생김).
    ctx.clock.set(T_V2);
    await setStatus(app, orderId, OrderStatus.IN_PRODUCTION, SOURCING);

    // T_V1 직후(확정 시점) 조회: 값은 버전1, status 는 CONFIRMED 여야 한다.
    const atConfirmed = await request(app.getHttpServer())
      .get(`/orders/${orderId}/at`)
      .set(BUYER)
      .query({ timestamp: new Date(T_V1.getTime() + 1000).toISOString() })
      .expect(200);
    expect(atConfirmed.body.status).toBe(OrderStatus.CONFIRMED);

    // T_V2 시점 조회: 같은 값 버전1이지만 status 는 IN_PRODUCTION 으로 보정.
    const atProduction = await request(app.getHttpServer())
      .get(`/orders/${orderId}/at`)
      .set(BUYER)
      .query({ timestamp: new Date(T_V2.getTime() + 1000).toISOString() })
      .expect(200);
    expect(atProduction.body.status).toBe(OrderStatus.IN_PRODUCTION);
  });
});
