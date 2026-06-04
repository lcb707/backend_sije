import { ApiProperty } from '@nestjs/swagger';
import { ChangeRequestStatus } from '../../common/enums/change-request-status.enum';
import { ChangeableField } from '../../common/enums/changeable-field.enum';
import { ChangeableValue } from '../../common/types/order-field.types';
import { ChangeRequest } from '../entities/change-request.entity';

class ChangeRequestItemResponseDto {
  @ApiProperty({ enum: ChangeableField })
  field!: ChangeableField;

  @ApiProperty({
    nullable: true,
    example: 'color',
    description: 'specs 의 특정 키만 변경한 경우 그 키(아니면 null)',
  })
  path!: string | null;

  @ApiProperty({ example: 1500 })
  newValue!: ChangeableValue;
}

export class ChangeRequestResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  orderId!: number;

  @ApiProperty({ example: '고객사 추가 주문으로 수량 상향' })
  reason!: string;

  @ApiProperty({ enum: ChangeRequestStatus })
  status!: ChangeRequestStatus;

  @ApiProperty({ example: 'buyer-01' })
  requestedBy!: string;

  @ApiProperty({ example: 'sourcing-01', nullable: true })
  reviewedBy!: string | null;

  @ApiProperty({ example: '재고 확인 완료', nullable: true })
  reviewComment!: string | null;

  @ApiProperty({
    example: 2,
    nullable: true,
    description: '승인 시 생성된 버전',
  })
  resultingVersion!: number | null;

  @ApiProperty({ type: [ChangeRequestItemResponseDto] })
  items!: ChangeRequestItemResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  reviewedAt!: Date | null;

  static fromEntity(cr: ChangeRequest): ChangeRequestResponseDto {
    const dto = new ChangeRequestResponseDto();
    dto.id = cr.id;
    dto.orderId = cr.orderId;
    dto.reason = cr.reason;
    dto.status = cr.status;
    dto.requestedBy = cr.requestedBy;
    dto.reviewedBy = cr.reviewedBy;
    dto.reviewComment = cr.reviewComment;
    dto.resultingVersion = cr.resultingVersion;
    dto.items = (cr.items ?? []).map((item) => ({
      field: item.field,
      path: item.path,
      newValue: item.newValue,
    }));
    dto.createdAt = cr.createdAt;
    dto.reviewedAt = cr.reviewedAt;
    return dto;
  }
}
