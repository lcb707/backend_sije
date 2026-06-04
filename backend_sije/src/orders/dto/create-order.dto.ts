import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { OrderSpecs } from '../../common/types/order-field.types';

/** 발주서 생성 요청. 주문자(BUYER)가 보낸다. */
export class CreateOrderDto {
  @ApiProperty({ example: '면 티셔츠', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  productName!: string;

  @ApiProperty({ example: 1000, description: '수량(양의 정수)' })
  @IsInt()
  @IsPositive()
  quantity!: number;

  @ApiProperty({ example: 5000, description: '단가(0 이상)' })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty({
    example: { color: 'white', size: 'L' },
    description:
      '사양(색상/사이즈 등 키-값). 키는 허용 마스터(spec_keys)에 정의된 것만 사용 가능.',
  })
  @IsObject()
  specs!: OrderSpecs;

  @ApiProperty({ example: '2025-03-15', description: '납기일(YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dueDate 는 YYYY-MM-DD 형식이어야 합니다.',
  })
  dueDate!: string;
}
