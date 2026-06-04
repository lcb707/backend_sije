import { Injectable } from '@nestjs/common';

/**
 * 현재 시각 제공자. 시간 의존 로직(스냅샷 valid_from 등)이 직접 `new Date()` 를 부르지 않게 하여,
 * 테스트에서 시각을 고정/주입할 수 있게 한다(CLAUDE.md §8: 결정론적 테스트).
 */
@Injectable()
export class ClockService {
  now(): Date {
    return new Date();
  }
}
