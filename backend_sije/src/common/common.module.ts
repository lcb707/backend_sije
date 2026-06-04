import { Global, Module } from '@nestjs/common';
import { ClockService } from './clock/clock.service';

/**
 * 공통 의존성 제공 모듈. ClockService 처럼 여러 도메인에서 주입받는 것을 전역으로 노출한다.
 * (RoleGuard 는 상태가 없고 컨트롤러에서 @UseGuards 로 직접 적용하므로 여기서 provider 로 두지 않는다.)
 */
@Global()
@Module({
  providers: [ClockService],
  exports: [ClockService],
})
export class CommonModule {}
