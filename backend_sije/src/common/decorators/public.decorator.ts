import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 전역 AuthUserGuard 의 인증을 면제한다(예: 헬스체크·공개 엔드포인트).
 * 현재 보호 범위상 거의 쓰이지 않지만, 전역 가드의 예외 표시 수단으로 둔다.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
