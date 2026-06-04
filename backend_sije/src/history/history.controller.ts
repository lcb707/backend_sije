import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { ChangeRequestStatus } from '../common/enums/change-request-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { DiffResponseDto } from './dto/diff.dto';
import { HistoryEntryDto } from './dto/history-entry.dto';
import {
  DiffQueryDto,
  GetAtQueryDto,
  GetHistoryQueryDto,
} from './dto/query.dto';
import { SnapshotStateDto } from './dto/snapshot-state.dto';
import { VersionChangeLogDto } from './dto/version-change-log.dto';
import {
  ApiDiff,
  ApiGetAt,
  ApiGetHistory,
  ApiGetVersion,
  ApiGetVersionChanges,
} from './history.api-docs';
import { HistoryService } from './history.service';

/**
 * 발주서 이력 조회: 전체 이력 / 특정 버전 / 버전별 변경 / 특정 시점 / 버전 비교.
 * 조회는 세 역할 공통 허용(생산자는 읽기 전용). 인증/인가는 전역 가드가 처리.
 * Swagger 데코레이터는 history.api-docs.ts 의 합성 데코레이터로 분리했다.
 */
@ApiTags('history')
@Controller('orders/:orderId')
@Roles(UserRole.BUYER, UserRole.SOURCING, UserRole.MANUFACTURER)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('history')
  @ApiGetHistory()
  async getHistory(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query() query: GetHistoryQueryDto,
  ): Promise<PaginatedResponseDto<HistoryEntryDto>> {
    const includeStatuses: ChangeRequestStatus[] = [];
    if (query.includeRejected) {
      includeStatuses.push(ChangeRequestStatus.REJECTED);
    }
    if (query.includePending) {
      includeStatuses.push(ChangeRequestStatus.PENDING);
    }
    const [entries, total] = await this.historyService.getHistory(
      orderId,
      includeStatuses,
      query.limit,
      query.offset,
    );
    return PaginatedResponseDto.of(entries, total, query.limit, query.offset);
  }

  @Get('versions/:version')
  @ApiGetVersion()
  async getVersion(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('version', ParseIntPipe) version: number,
  ): Promise<SnapshotStateDto> {
    return this.historyService.getVersion(orderId, version);
  }

  @Get('versions/:version/changes')
  @ApiGetVersionChanges()
  async getVersionChanges(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('version', ParseIntPipe) version: number,
  ): Promise<VersionChangeLogDto> {
    return this.historyService.getVersionChanges(orderId, version);
  }

  @Get('at')
  @ApiGetAt()
  async getAt(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query() query: GetAtQueryDto,
  ): Promise<SnapshotStateDto> {
    return this.historyService.getAt(orderId, new Date(query.timestamp));
  }

  @Get('diff')
  @ApiDiff()
  async diff(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query() query: DiffQueryDto,
  ): Promise<DiffResponseDto> {
    return this.historyService.diff(orderId, query.from, query.to);
  }
}
