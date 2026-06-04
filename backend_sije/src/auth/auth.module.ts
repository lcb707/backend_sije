import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthUserGuard } from './auth-user.guard';
import { RolesGuard } from './roles.guard';
import { User } from './entities/user.entity';
import { UserSeedService } from './user-seed.service';

/**
 * 인증/인가 모듈.
 * APP_GUARD 는 인증 → 인가 순으로 둔다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    AuthService,
    UserSeedService,
    { provide: APP_GUARD, useClass: AuthUserGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
