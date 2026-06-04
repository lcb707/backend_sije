import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * .env.test 를 읽어 process.env 에 주입한다(이미 설정된 값은 덮어쓰지 않음).
 * NestJS ConfigModule 은 process.env 를 우선하므로, 테스트는 이 값으로 별도 스키마에 연결된다.
 * jest setup 파일에서 import 되어 모든 스위트 시작 전에 실행된다.
 */
function loadTestEnv(): void {
  const path = join(__dirname, '..', '..', '.env.test');
  const content = readFileSync(path, 'utf-8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadTestEnv();
