import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** 승인/반려 공용 요청. 검토 의견은 필수로 기록한다. */
export class ReviewDto {
  @ApiProperty({ example: '재고 확인 완료, 승인합니다.', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reviewComment!: string;
}
