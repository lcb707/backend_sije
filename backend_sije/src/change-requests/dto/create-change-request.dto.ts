import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ChangeRequestItemDto } from './change-request-item.dto';

/** 변경 요청 생성. 주문자(BUYER)가 보낸다. 변경 항목은 1개 이상. */
export class CreateChangeRequestDto {
  @ApiProperty({ example: '고객사 추가 주문으로 수량 상향', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @ApiProperty({ type: [ChangeRequestItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1, { message: '변경 항목은 1개 이상이어야 합니다.' })
  @ValidateNested({ each: true })
  @Type(() => ChangeRequestItemDto)
  items!: ChangeRequestItemDto[];
}
