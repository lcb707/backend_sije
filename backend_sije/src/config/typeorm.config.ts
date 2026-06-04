import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * MySQL 8 연결 설정 팩토리.
 *
 * - timezone 'Z'(UTC): datetime(3) 값을 UTC로 일관 저장/조회. 시점 조회 경계의 정확성 근거.
 * - DB_SYNCHRONIZE=true 는 과제/개발 편의. // PROD-NOTE: 운영은 false + 마이그레이션 사용.
 * - 엔티티는 glob 으로 자동 수집(모듈마다 forFeature 로도 등록하지만, 루트에서 일괄 인식되게 둔다).
 * - retryAttempts/Delay: compose 에 DB healthcheck 가 없으므로, app 이 MySQL 준비보다 먼저
 *   떠도 연결을 재시도해 결국 붙도록 한다.
 */
export function buildTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  return {
    type: 'mysql',
    host: config.get<string>('DB_HOST'),
    port: parseInt(config.get<string>('DB_PORT', '3306'), 10),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
    database: config.get<string>('DB_DATABASE'),
    timezone: 'Z',
    charset: 'utf8mb4',
    autoLoadEntities: true,
    synchronize: config.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
    logging: config.get<string>('DB_LOGGING', 'false') === 'true',
    retryAttempts: 15,
    retryDelay: 3000,
  };
}
