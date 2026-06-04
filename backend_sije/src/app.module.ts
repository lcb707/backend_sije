import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { buildTypeOrmOptions } from './config/typeorm.config';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { ChangeRequestsModule } from './change-requests/change-requests.module';
import { HistoryModule } from './history/history.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: buildTypeOrmOptions,
    }),
    CommonModule,
    AuthModule,
    OrdersModule,
    ChangeRequestsModule,
    HistoryModule,
  ],
})
export class AppModule {}
