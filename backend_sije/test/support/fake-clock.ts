import { ClockService } from '../../src/common/clock/clock.service';

/**
 * 테스트용 시계. now() 가 반환할 시각을 명시 주입한다(CLAUDE.md §8: 결정론적 테스트).
 * 시점 조회 경계(B2)를 검증하려면 각 버전의 valid_from 을 정확히 통제해야 한다.
 */
export class FakeClock extends ClockService {
  private current: Date;

  constructor(initial: Date) {
    super();
    this.current = initial;
  }

  now(): Date {
    return this.current;
  }

  set(next: Date): void {
    this.current = next;
  }
}
