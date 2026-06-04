import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnapshotModule } from '../history/snapshot.module';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { SpecKey } from './entities/spec-key.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SpecKeyService } from './spec-key.service';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseOrder, SpecKey]), SnapshotModule],
  controllers: [OrdersController],
  providers: [OrdersService, SpecKeyService],
  exports: [OrdersService, SpecKeyService],
})
export class OrdersModule {}
