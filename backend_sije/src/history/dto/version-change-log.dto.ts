import { ApiProperty } from '@nestjs/swagger';
import { OrderChangeLog } from '../entities/order-change-log.entity';
import { ChangeLogDto } from './history-entry.dto';

/** 특정 버전의 변경 이력(델타) 응답. GET /orders/:id/versions/:version/changes */
export class VersionChangeLogDto {
  @ApiProperty({ example: 2 })
  version!: number;

  @ApiProperty({ type: [ChangeLogDto], description: '버전1(생성)은 빈 배열' })
  changes!: ChangeLogDto[];

  static build(version: number, logs: OrderChangeLog[]): VersionChangeLogDto {
    const dto = new VersionChangeLogDto();
    dto.version = version;
    dto.changes = logs.map((log) => ChangeLogDto.fromEntity(log));
    return dto;
  }
}
