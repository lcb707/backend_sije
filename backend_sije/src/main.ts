import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { requestLogger } from './common/middleware/request-logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // 프론트(브라우저)에서 커스텀 헤더 X-User-Id 로 호출하므로 CORS 허용 필요.
  // 커스텀 헤더는 preflight(OPTIONS) + Allow-Headers 가 있어야 브라우저가 전송한다.
  app.enableCors({
    origin: true,
    allowedHeaders: ['Content-Type', 'X-User-Id'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // HTTP 요청/응답 로깅(메서드·경로·상태·소요시간·주체 X-User-Id)
  app.use(requestLogger);

  // CLAUDE.md §7: 모든 DTO 검증. whitelist + forbidNonWhitelisted 로 미정의 필드 차단.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('발주서 변경 승인 프로세스 API')
    .setDescription(
      '주문자 변경 요청 → 소싱팀 승인/반려 → 발주서 반영 및 버전/시점/비교 이력 조회',
    )
    .setVersion('1.0')
    // 주체는 X-User-Id(시드 username)로만 식별한다. 역할은 헤더가 아니라 서버(users 테이블)가 결정.
    .addGlobalParameters({
      name: 'X-User-Id',
      in: 'header',
      required: false,
      schema: { type: 'string', example: 'buyer1' },
      description:
        '요청 주체(시드 계정의 username). 역할은 서버가 DB 에서 결정한다. 예: buyer1/buyer2/sourcing1/sourcing2/maker1',
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const config = app.get(ConfigService);
  const port = parseInt(config.get<string>('APP_PORT', '3000'), 10);
  await app.listen(port);
}

void bootstrap();
