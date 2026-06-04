import { UserRole } from '../enums/user-role.enum';

/** 요청 주체. 인증은 단순화하여 헤더에서 주입하지만, 역할 검증은 가드로 강제한다. */
export interface AuthUser {
  readonly userId: string;
  readonly role: UserRole;
}

/**
 * Express Request 에 주체를 실어 나르기 위한 타입 확장.
 * RoleGuard 가 채우고 @CurrentUser 가 읽는다(문자열 인덱싱 대신 타입 안전한 프로퍼티 사용).
 */
declare module 'express' {
  interface Request {
    authUser?: AuthUser;
  }
}
