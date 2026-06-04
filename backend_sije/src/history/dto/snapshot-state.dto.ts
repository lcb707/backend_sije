import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { OrderSpecs } from '../../common/types/order-field.types';
import { PurchaseOrderSnapshot } from '../entities/purchase-order-snapshot.entity';

/** 특정 버전/시점의 발주서 전체 상태(스냅샷 기반). 버전 조회·시점 조회의 응답. */
export class SnapshotStateDto {
  @ApiProperty({ example: 1 })
  orderId!: number;

  @ApiProperty({ example: 2 })
  version!: number;

  @ApiProperty({ example: '면 티셔츠' })
  productName!: string;

  @ApiProperty({ example: 1500 })
  quantity!: number;

  @ApiProperty({ example: 5000 })
  unitPrice!: number;

  @ApiProperty({ example: { color: 'white', size: 'L' } })
  specs!: OrderSpecs;

  @ApiProperty({ example: '2025-03-15' })
  dueDate!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ description: '이 버전이 적용된 시각' })
  validFrom!: Date;

  @ApiProperty({
    nullable: true,
    description: '다음 버전 시작 시각(최신=null)',
  })
  validTo!: Date | null;

  static fromEntity(s: PurchaseOrderSnapshot): SnapshotStateDto {
    const dto = new SnapshotStateDto();
    dto.orderId = s.orderId;
    dto.version = s.version;
    dto.productName = s.productName;
    dto.quantity = s.quantity;
    dto.unitPrice = s.unitPrice;
    dto.specs = s.specs;
    dto.dueDate = s.dueDate;
    dto.status = s.status;
    dto.validFrom = s.validFrom;
    dto.validTo = s.validTo;
    return dto;
  }
}
