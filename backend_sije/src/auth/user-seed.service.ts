import { Injectable, OnModuleInit } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SEED_USERS } from './seed-users';

/**
 * 부팅 시 시드 계정을 생성한다. 
 */
@Injectable()
export class UserSeedService implements OnModuleInit {
  constructor(private readonly authService: AuthService) {}

  async onModuleInit(): Promise<void> {
    for (const user of SEED_USERS) {
      await this.authService.ensureSeedUser(
        user.username,
        user.role,
        user.displayName,
      );
    }
  }
}
