import { Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

/**
 * HTTP 요청/응답 로깅 미들웨어.
 * 메서드·경로·상태코드·소요시간과 요청 주체(X-User-Id)를 한 줄로 남긴다.
 * 응답 완료(finish) 시점에 기록하여 상태코드를 포함한다.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();
  const userId = req.header('X-User-Id') ?? '-';

  res.on('finish', () => {
    const ms = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;
    const message = `${method} ${originalUrl} ${statusCode} ${ms}ms · user=${userId}`;

    // 4xx/5xx 는 경고/에러로 구분해 가시성을 높인다.
    if (statusCode >= 500) {
      logger.error(message);
    } else if (statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.log(message);
    }
  });

  next();
}
