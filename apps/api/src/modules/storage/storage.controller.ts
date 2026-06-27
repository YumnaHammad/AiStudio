import { Controller, Get, Query } from '@nestjs/common';
import { StorageService } from './storage.service';
import { Roles } from '../../common/decorators/auth.decorators';
import { UserRole } from '@acs/database';
import { IsString } from 'class-validator';

class SignedUrlQueryDto {
  @IsString()
  key!: string;
}

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('signed-url')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.OWNER, UserRole.VIEWER)
  async getSignedUrl(@Query() query: SignedUrlQueryDto) {
    const url = await this.storageService.getSignedDownloadUrl(query.key);
    return { url, expiresIn: 3600 };
  }

  @Get('status')
  status() {
    return { configured: this.storageService.isConfigured() };
  }
}
