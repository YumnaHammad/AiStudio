import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PromptsService } from './prompts.service';
import {
  CreatePromptDto,
  CreatePromptVersionDto,
  UpdatePromptDto,
} from './dto/prompt.dto';
import { CurrentUser } from '../../common/decorators/request.decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/auth.decorators';
import { UserRole } from '@acs/database';
import { IsInt, Min } from 'class-validator';

class RollbackDto {
  @IsInt()
  @Min(1)
  targetVersion!: number;
}

class PreviewDto {
  variables!: Record<string, unknown>;
}

@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get()
  list(@Query('workerKey') workerKey?: string) {
    return this.promptsService.findAll(workerKey);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.promptsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePromptDto,
  ) {
    return this.promptsService.create(dto, user.id, user.workspaceId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromptDto,
  ) {
    return this.promptsService.update(id, dto);
  }

  @Post(':id/versions')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  createVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePromptVersionDto,
  ) {
    return this.promptsService.createVersion(id, dto, user.id, user.workspaceId);
  }

  @Patch(':id/versions/:versionId/activate')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  activate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.promptsService.activateVersion(id, versionId, user.id, user.workspaceId);
  }

  @Post(':id/rollback')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  rollback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RollbackDto,
  ) {
    return this.promptsService.rollback(id, dto.targetVersion, user.id, user.workspaceId);
  }

  @Post(':id/versions/:versionId/preview')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.EDITOR)
  preview(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: PreviewDto,
  ) {
    return this.promptsService.preview(id, versionId, dto.variables ?? {});
  }
}
