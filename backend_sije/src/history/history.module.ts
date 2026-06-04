import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangeRequest } from '../change-requests/entities/change-request.entity';
import { OrderChangeLog } from './entities/order-change-log.entity';
import { PurchaseOrderSnapshot } from './entities/purchase-order-snapshot.entity';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { SnapshotModule } from './snapshot.module';

/** 이력 조회 API 모듈. 스냅샷 생성(SnapshotService/SnapshotModule)과는 책임이 분리되어 있다. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrderSnapshot,
      OrderChangeLog,
      ChangeRequest,
    ]),
    SnapshotModule,
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
