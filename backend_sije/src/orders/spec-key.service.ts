import {
  Injectable,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ERROR_MESSAGES } from '../common/constants/error-messages';
import { SpecKey } from './entities/spec-key.entity';
import { SEED_SPEC_KEYS } from './seed-spec-keys';

/**
 * 허용 사양 키 마스터를 관리·검증한다.
 *
 * - 부팅 시 시드 키를 멱등 생성(OnModuleInit). 테스트도 앱 부팅 시 채워진다.
 * - assertKeysAllowed: 주어진 키들이 모두 마스터에 있는지 검증(쓰기 경로에서 호출).
 *
 * 마스터에 없는 키는 비즈니스 규칙 위반으로 보아 422 로 거부한다(CLAUDE.md §4 예외 매핑).
 */
@Injectable()
export class SpecKeyService implements OnModuleInit {
  constructor(
    @InjectRepository(SpecKey)
    private readonly repo: Repository<SpecKey>,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const seed of SEED_SPEC_KEYS) {
      const exists = await this.repo.exists({ where: { key: seed.key } });
      if (!exists) {
        await this.repo.save(this.repo.create(seed));
      }
    }
  }

  /**
   * 주어진 키들이 모두 마스터에 정의돼 있는지 검증한다. 하나라도 없으면 422.
   * 빈 배열은 통과(검증할 키 없음).
   */
  async assertKeysAllowed(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }
    const unique = [...new Set(keys)];
    const found = await this.repo.countBy({ key: In(unique) });
    if (found !== unique.length) {
      throw new UnprocessableEntityException(
        ERROR_MESSAGES.SPEC_KEY_NOT_ALLOWED,
      );
    }
  }
}
