import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderChangeLog } from '../history/entities/order-change-log.entity';
import { SnapshotModule } from '../history/snapshot.module';
import { PurchaseOrder } from '../orders/entities/purchase-order.entity';
import { ChangeRequestsController } from './change-requests.controller';
import { ChangeRequestsService } from './change-requests.service';
import { ChangeRequestItem } from './entities/change-request-item.entity';
import { ChangeRequest } from './entities/change-request.entity';
import { OrderChangeRequestsController } from './order-change-requests.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChangeRequest,
      ChangeRequestItem,
      PurchaseOrder,
      OrderChangeLog,
    ]),
    SnapshotModule,
  ],
  controllers: [OrderChangeRequestsController, ChangeRequestsController],
  providers: [ChangeRequestsService],
})
export class ChangeRequestsModule {}
