import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../auth/auth-user';

/**
 * RoleGuard 가 Request 에 주입한 주체를 컨트롤러 핸들러 인자로 꺼낸다.
 * @Roles 가드를 통과한 핸들러에서만 사용하므로 항상 존재한다고 본다.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.authUser as AuthUser;
  },
);
