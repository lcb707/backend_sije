import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsNumberString,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

/**
 * 환경변수 스키마. 앱 부팅 시점에 검증하여 잘못된 설정으로 뜨는 것을 막는다.
 * (DB 자격증명 누락 등을 런타임 쿼리 시점이 아니라 부팅 즉시 드러낸다.)
 */
class EnvironmentVariables {
  @IsOptional()
  @IsNumberString()
  APP_PORT?: string;

  @IsString()
  DB_HOST!: string;

  @IsNumberString()
  DB_PORT!: string;

  @IsString()
  DB_USERNAME!: string;

  @IsString()
  DB_PASSWORD!: string;

  @IsString()
  DB_DATABASE!: string;

  @IsOptional()
  @IsBooleanString()
  DB_SYNCHRONIZE?: string;

  @IsOptional()
  @IsBooleanString()
  DB_LOGGING?: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`환경변수 검증 실패: ${errors.toString()}`);
  }
  return validated;
}
