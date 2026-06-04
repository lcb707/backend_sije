import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

/** 사용자 조회·시드 생성. 비밀번호/토큰이 없으므로 "username → 계정" 매핑만 담당. */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** username 으로 계정 조회(가드의 주체 식별에 사용). 없으면 null. */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  /** 시드 계정을 멱등하게 생성한다(이미 있으면 건너뜀). 기존 계정은 덮어쓰지 않는다. */
  async ensureSeedUser(
    username: string,
    role: User['role'],
    displayName: string,
  ): Promise<void> {
    const exists = await this.userRepo.exists({ where: { username } });
    if (exists) {
      return;
    }
    await this.userRepo.save(
      this.userRepo.create({ username, role, displayName }),
    );
  }
}
