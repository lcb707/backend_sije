import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

/**
 * 컨트롤러 메서드 위에 반복되던 공통 에러 응답 데코레이터를 한 번에 묶는다.
 * 각 엔드포인트가 실제로 낼 수 있는 응답만 골라 켜도록 옵션으로 제어한다.
 *
 * 사용 예) @ApiCommonErrors({ notFound: true, conflict409: false })
 */
export interface CommonErrorOptions {
  /** 401: 인증 실패(미인증 헤더). 거의 모든 보호 엔드포인트 공통. */
  unauthorized?: boolean;
  /** 403: 역할 위반(@Roles 가드). */
  forbidden?: boolean;
  /** 404: 리소스/버전 없음. */
  notFound?: boolean;
  /** 400: 입력 검증 실패(ValidationPipe). */
  badRequest?: boolean;
  /** 422: 실질 변경 없음 등 의미적 거부. */
  unprocessable?: boolean;
}

export function ApiCommonErrors(
  options: CommonErrorOptions = {},
): ReturnType<typeof applyDecorators> {
  const {
    unauthorized = true,
    forbidden = false,
    notFound = false,
    badRequest = false,
    unprocessable = false,
  } = options;

  const decorators = [];
  if (unauthorized) {
    decorators.push(ApiUnauthorizedResponse({ description: '인증 실패' }));
  }
  if (forbidden) {
    decorators.push(ApiForbiddenResponse({ description: '역할 권한 없음' }));
  }
  if (notFound) {
    decorators.push(
      ApiNotFoundResponse({ description: '리소스를 찾을 수 없음' }),
    );
  }
  if (badRequest) {
    decorators.push(ApiBadRequestResponse({ description: '입력 검증 실패' }));
  }
  if (unprocessable) {
    decorators.push(
      ApiUnprocessableEntityResponse({ description: '처리할 수 없는 요청' }),
    );
  }
  return applyDecorators(...decorators);
}
