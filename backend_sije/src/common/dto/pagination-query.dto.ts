import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** 페이지네이션 기본값/상한(목록 조회 공통). */
export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;
export const PAGINATION_DEFAULT_OFFSET = 0;

/**
 * limit/offset 기반 목록 조회 쿼리(공통).
 * 미지정 시 limit=20, offset=0. limit 상한은 100(과도한 응답 방지).
 * 쿼리스트링은 문자열이므로 @Type(Number)로 변환 후 정수 검증한다.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: '가져올 최대 개수',
    minimum: 1,
    maximum: PAGINATION_MAX_LIMIT,
    default: PAGINATION_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_LIMIT)
  limit: number = PAGINATION_DEFAULT_LIMIT;

  @ApiPropertyOptional({
    description: '건너뛸 개수(0부터)',
    minimum: 0,
    default: PAGINATION_DEFAULT_OFFSET,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = PAGINATION_DEFAULT_OFFSET;
}
