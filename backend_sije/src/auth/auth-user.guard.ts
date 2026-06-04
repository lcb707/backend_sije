import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthUser } from '../common/auth/auth-user';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';

/**
 * 인증(authentication): 요청 주체를 식별한다.
 *
 * - `X-User-Id` 헤더의 username 으로 users 테이블을 조회해 주체를 결정한다.
 * - 역할은 헤더가 아니라 DB 에서 온다(클라이언트의 역할 위조 차단 — 이 기능의 핵심).
 * - 헤더가 없거나 등록되지 않은 사용자면 401.
 *
 */
@Injectable()
export class AuthUserGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const username = request.header('X-User-Id');
    if (!username) {
      throw new UnauthorizedException('X-User-Id 헤더가 필요합니다.');
    }

    const user = await this.authService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('등록되지 않은 사용자입니다.');
    }

    const authUser: AuthUser = { userId: user.username, role: user.role };
    request.authUser = authUser;
    return true;
  }
}
