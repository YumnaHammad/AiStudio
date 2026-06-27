import { Global, Module } from '@nestjs/common';
import { LoggerService } from './services/logger.service';
import { EncryptionService } from './services/encryption.service';

@Global()
@Module({
  providers: [LoggerService, EncryptionService],
  exports: [LoggerService, EncryptionService],
})
export class CommonModule {}
