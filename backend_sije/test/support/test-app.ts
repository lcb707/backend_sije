import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { ClockService } from '../../src/common/clock/clock.service';
import { FakeClock } from './fake-clock';

export interface TestContext {
  app: INestApplication;
  dataSource: DataSource;
  clock: FakeClock;
}

/**
 * 테스트용 Nest 앱을 띄운다.
 *  - ClockService 를 FakeClock 으로 교체(시간 결정성).
 *  - 운영과 동일한 전역 ValidationPipe 적용.
 *  - 매 호출마다 스키마를 동기화(synchronize:true + .env.test 의 별도 스키마)하여 격리.
 *
 * 사용 측에서 beforeEach 로 호출하고 afterEach 로 close 하면 테스트 간 상태가 누수되지 않는다.
 */
export async function createTestApp(initialNow: Date): Promise<TestContext> {
  const clock = new FakeClock(initialNow);

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ClockService)
    .useValue(clock)
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  // app.init() 이 TypeOrm synchronize(스키마 생성)와 UserSeedService(시드) 를 실행한다.
  // 여기서 추가로 dataSource.synchronize(true)(drop 포함)를 호출하면 방금 만든 시드가 날아가므로 하지 않는다.
  // 테스트 간 격리는 truncateAll(users 제외)로 도메인 데이터만 비운다.
  await app.init();

  const dataSource = app.get(DataSource);
  return { app, dataSource, clock };
}

export async function closeTestApp(ctx: TestContext): Promise<void> {
  await ctx.app.close();
}

/**
 * 모든 도메인 테이블을 비운다(앱을 재부팅하지 않고 테스트 간 데이터만 격리).
 * FK 제약을 잠시 해제하고 TRUNCATE 한다.
 */
export async function truncateAll(dataSource: DataSource): Promise<void> {
  const tables = [
    'order_change_logs',
    'change_request_items',
    'change_requests',
    'purchase_order_snapshots',
    'order_status_history',
    'purchase_orders',
  ];
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    await dataSource.query(`TRUNCATE TABLE \`${table}\``);
  }
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
}
