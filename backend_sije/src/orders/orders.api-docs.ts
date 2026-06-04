import { applyDecorators } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrors } from '../common/swagger/api-common-errors.decorator';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { OrderResponseDto } from './dto/order-response.dto';

/** orders 컨트롤러의 Swagger 데코레이터 묶음. */

export const ApiCreateOrder = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({ summary: '발주서 생성 (버전1 스냅샷 포함)' }),
    ApiCreatedResponse({ type: OrderResponseDto }),
    ApiCommonErrors({ forbidden: true, badRequest: true }),
  );

export const ApiFindAllOrders = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({ summary: '발주서 목록 조회 (최신순, 페이지네이션)' }),
    ApiPaginatedResponse(OrderResponseDto),
    ApiCommonErrors(),
  );

export const ApiFindOneOrder = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({ summary: '발주서 현재 상태 조회' }),
    ApiOkResponse({ type: OrderResponseDto }),
    ApiCommonErrors({ notFound: true }),
  );

export const ApiUpdateOrderStatus = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiOperation({
      summary: '발주서 상태 전이',
      description:
        'DRAFT→PENDING→CONFIRMED→IN_PRODUCTION→COMPLETED. 제출(DRAFT→PENDING)은 BUYER, 그 외는 SOURCING. 허용되지 않은 전이는 409, 역할 위반은 403. COMPLETED 전이 시 미결 PENDING 변경요청은 자동 반려된다.',
    }),
    ApiOkResponse({ type: OrderResponseDto }),
    ApiCommonErrors({ forbidden: true, notFound: true, badRequest: true }),
  );
