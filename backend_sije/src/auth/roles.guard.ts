import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

/**
 * 인가(authorization): 주체의 역할이 `@Roles(...)` 와 맞는지 검사한다.
 *
 * AuthUserGuard 다음에 실행되어 request.authUser 가 채워져 있다고 본다.
 * - `@Roles` 가 없으면 통과(인증만 됐으면 OK).
 * - 역할 불일치면 403.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      UserRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const role = request.authUser?.role;
    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException(
        `이 작업은 ${requiredRoles.join(', ')} 역할만 수행할 수 있습니다.`,
      );
    }
    return true;
  }
}
