import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { OrderSpecs } from '../../common/types/order-field.types';
import { PurchaseOrder } from '../entities/purchase-order.entity';

/** 발주서 현재 상태 응답. Entity 를 그대로 노출하지 않고 필요한 필드만 매핑한다. */
export class OrderResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '면 티셔츠' })
  productName!: string;

  @ApiProperty({ example: 1000 })
  quantity!: number;

  @ApiProperty({ example: 5000 })
  unitPrice!: number;

  @ApiProperty({ example: { color: 'white', size: 'L' } })
  specs!: OrderSpecs;

  @ApiProperty({ example: '2025-03-15' })
  dueDate!: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.CONFIRMED })
  status!: OrderStatus;

  @ApiProperty({ example: 3, description: '현재 버전' })
  currentVersion!: number;

  @ApiProperty({ example: 'buyer-01' })
  createdBy!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(order: PurchaseOrder): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = order.id;
    dto.productName = order.productName;
    dto.quantity = order.quantity;
    dto.unitPrice = order.unitPrice;
    dto.specs = order.specs;
    dto.dueDate = order.dueDate;
    dto.status = order.status;
    dto.currentVersion = order.currentVersion;
    dto.createdBy = order.createdBy;
    dto.createdAt = order.createdAt;
    dto.updatedAt = order.updatedAt;
    return dto;
  }
}
