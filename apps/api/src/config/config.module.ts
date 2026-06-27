import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  appConfig,
  databaseConfig,
  encryptionConfig,
  jwtConfig,
  r2Config,
  redisConfig,
} from './configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, encryptionConfig, r2Config],
      envFilePath: ['.env', '../../.env'],
    }),
  ],
})
export class AppConfigModule {}
