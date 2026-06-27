import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/api-key.dto';
import { CurrentUser } from '../../common/decorators/request.decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/auth.decorators';
import { UserRole } from '@acs/database';

@Controller('settings/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.apiKeysService.findAll(user.workspaceId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeysService.create(user.workspaceId, user.id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.apiKeysService.remove(user.workspaceId, user.id, id);
  }
}
