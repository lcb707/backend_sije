import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrors } from '../common/swagger/api-common-errors.decorator';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { DiffResponseDto } from './dto/diff.dto';
import { HistoryEntryDto } from './dto/history-entry.dto';
import { SnapshotStateDto } from './dto/snapshot-state.dto';
import { VersionChangeLogDto } from './dto/version-change-log.dto';

/**
 * history 컨트롤러의 Swagger 데코레이터 묶음.
 * 컨트롤러 메서드 위가 길어지지 않도록 applyDecorators 로 합성해 한 줄로 사용한다.
 */

export const ApiGetHistory = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({
      summary: '변경 이력 조회 (버전별 전체 상태 + 델타, 시간순)',
      description:
        'includeRejected=true 면 거절/대기 변경요청도 시간순으로 병합해 반환한다. limit/offset 페이지네이션 지원.',
    }),
    ApiPaginatedResponse(HistoryEntryDto),
    ApiCommonErrors({ notFound: true, badRequest: true }),
  );

export const ApiGetVersion = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({ summary: '특정 버전 상태 조회' }),
    ApiOkResponse({ type: SnapshotStateDto }),
    ApiCommonErrors({ notFound: true }),
  );

export const ApiGetVersionChanges = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({ summary: '특정 버전의 변경 이력(델타) 조회' }),
    ApiOkResponse({ type: VersionChangeLogDto }),
    ApiCommonErrors({ notFound: true }),
  );

export const ApiGetAt = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({ summary: '특정 시점 상태 조회' }),
    ApiOkResponse({ type: SnapshotStateDto }),
    ApiCommonErrors({ notFound: true, badRequest: true }),
  );

export const ApiDiff = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({ summary: '버전 간 비교 (달라진 필드만)' }),
    ApiOkResponse({ type: DiffResponseDto }),
    ApiCommonErrors({ notFound: true, badRequest: true }),
  );
