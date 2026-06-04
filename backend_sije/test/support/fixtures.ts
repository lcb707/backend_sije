import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OrderStatus } from '../../src/common/enums/order-status.enum';

/**
 * 인증 헤더 = 시드 계정의 username(X-User-Id)만. 역할은 서버(users)가 결정한다.
 * 같은 역할 2계정(buyer1/buyer2 등)은 감사 정합성 테스트에서 "다른 사람"을 표현하는 데 쓴다.
 */
export const BUYER = { 'X-User-Id': 'buyer1' };
export const BUYER2 = { 'X-User-Id': 'buyer2' };
export const SOURCING = { 'X-User-Id': 'sourcing1' };
export const SOURCING2 = { 'X-User-Id': 'sourcing2' };
export const MANUFACTURER = { 'X-User-Id': 'maker1' };

export const DEFAULT_ORDER = {
  productName: '티셔츠',
  quantity: 1000,
  unitPrice: 5000,
  specs: { color: 'white', size: 'L' },
  dueDate: '2025-03-15',
};

/** 발주서를 생성한다(DRAFT). 생성된 id 반환. */
export async function createOrder(
  app: INestApplication,
  overrides: Partial<typeof DEFAULT_ORDER> = {},
): Promise<number> {
  const res = await request(app.getHttpServer())
    .post('/orders')
    .set(BUYER)
    .send({ ...DEFAULT_ORDER, ...overrides })
    .expect(201);
  return res.body.id;
}

/** 발주서를 CONFIRMED 까지 올린다(제출→확정). */
export async function confirmOrder(
  app: INestApplication,
  orderId: number,
): Promise<void> {
  const server = app.getHttpServer();
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
}

/** 변경요청을 생성하고 id 를 반환한다. */
export async function createChangeRequest(
  app: INestApplication,
  orderId: number,
  items: { field: string; path?: string; newValue: unknown }[],
  reason = '테스트 변경 요청',
): Promise<number> {
  const res = await request(app.getHttpServer())
    .post(`/orders/${orderId}/change-requests`)
    .set(BUYER)
    .send({ reason, items })
    .expect(201);
  return res.body.id;
}
