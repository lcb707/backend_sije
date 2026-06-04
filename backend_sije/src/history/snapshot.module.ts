import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { PurchaseOrderSnapshot } from './entities/purchase-order-snapshot.entity';
import { SnapshotService } from './snapshot.service';

/**
 * 스냅샷 생성/조회 공용 서비스만 담는 가벼운 모듈.
 * orders·change-requests 가 이 모듈만 import 해 SnapshotService 를 주입받는다(순환 의존 회피).
 * 조회 API(history/version/at/diff)는 별도 HistoryModule 이 담당한다.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrderSnapshot, OrderStatusHistory]),
  ],
  providers: [SnapshotService],
  exports: [SnapshotService],
})
export class SnapshotModule {}
