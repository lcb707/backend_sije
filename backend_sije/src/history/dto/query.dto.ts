import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/** 쿼리스트링의 'true'/'1' 을 boolean 으로 변환(미지정은 false). */
function toBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === '1';
}

/**
 * 변경 이력 조회 쿼리(거절/대기 변경요청 포함 여부 + 페이지네이션).
 * PaginationQueryDto 를 상속해 limit/offset 을 함께 받는다.
 */
export class GetHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: '거절(REJECTED)된 변경요청도 이력에 포함',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includeRejected?: boolean;

  @ApiPropertyOptional({
    description: '대기(PENDING) 중인 변경요청도 이력에 포함',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includePending?: boolean;
}

/** 특정 시점 조회 쿼리. */
export class GetAtQueryDto {
  @ApiProperty({
    example: '2025-02-16T00:00:00.000Z',
    description: '조회 시점(ISO 8601, UTC 권장)',
  })
  @IsISO8601()
  timestamp!: string;
}

/** 버전 비교 쿼리. */
export class DiffQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  from!: number;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  to!: number;
}
