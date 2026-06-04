import { ApiProperty } from '@nestjs/swagger';

/**
 * 페이지네이션 응답 봉투(envelope).
 * 목록 자체(items)와 함께 전체 개수/현재 페이지 파라미터를 돌려줘
 * 클라이언트가 다음 페이지 존재 여부(offset + items.length < total)를 판단할 수 있게 한다.
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: '현재 페이지 항목', isArray: true })
  items!: T[];

  @ApiProperty({ description: '조건에 맞는 전체 개수', example: 137 })
  total!: number;

  @ApiProperty({ description: '요청한 limit', example: 20 })
  limit!: number;

  @ApiProperty({ description: '요청한 offset', example: 0 })
  offset!: number;

  static of<T>(
    items: T[],
    total: number,
    limit: number,
    offset: number,
  ): PaginatedResponseDto<T> {
    const dto = new PaginatedResponseDto<T>();
    dto.items = items;
    dto.total = total;
    dto.limit = limit;
    dto.offset = offset;
    return dto;
  }
}
