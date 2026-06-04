import { applyDecorators } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrors } from '../common/swagger/api-common-errors.decorator';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { ChangeRequestResponseDto } from './dto/change-request-response.dto';

/** change-requests 컨트롤러(생성/목록/승인/반려)의 Swagger 데코레이터 묶음. */

export const ApiCreateChangeRequest = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({ summary: '변경 요청 생성 (주문자)' }),
    ApiCreatedResponse({ type: ChangeRequestResponseDto }),
    ApiCommonErrors({ forbidden: true, notFound: true, badRequest: true }),
  );

export const ApiListChangeRequests = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({ summary: '발주서의 변경요청 목록 (최신순, 페이지네이션)' }),
    ApiPaginatedResponse(ChangeRequestResponseDto),
    ApiCommonErrors(),
  );

export const ApiApproveChangeRequest = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({
      summary: '변경 요청 승인 (발주서 반영 + 이력 저장, 단일 트랜잭션)',
      description:
        '실질 변경이 없으면(모든 항목이 기존값과 동일) 422 로 거부한다. 완료된 발주서는 승인할 수 없다(409).',
    }),
    ApiOkResponse({ type: ChangeRequestResponseDto }),
    ApiCommonErrors({ forbidden: true, notFound: true, unprocessable: true }),
  );

export const ApiRejectChangeRequest = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({ summary: '변경 요청 반려 (발주서 불변)' }),
    ApiOkResponse({ type: ChangeRequestResponseDto }),
    ApiCommonErrors({ forbidden: true, notFound: true }),
  );
