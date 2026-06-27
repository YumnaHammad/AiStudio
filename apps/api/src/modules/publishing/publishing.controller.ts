import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { PublishingService } from './publishing.service';
import { CurrentUser } from '../../common/decorators/request.decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/auth.decorators';
import { UserRole } from '@acs/database';
import { IsUUID } from 'class-validator';

class PublishDto {
  @IsUUID()
  videoId!: string;

  @IsUUID()
  platformConnectionId!: string;
}

@Controller()
export class PublishingController {
  constructor(private readonly publishingService: PublishingService) {}

  @Post('videos/:videoId/publish')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.OWNER)
  publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('videoId', ParseUUIDPipe) videoId: string,
    @Body() dto: PublishDto,
  ) {
    return this.publishingService.publishVideo(
      videoId,
      dto.platformConnectionId,
      user.workspaceId,
    );
  }

  @Get('projects/:projectId/publishing')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.publishingService.getPublishRecords(projectId, user.workspaceId);
  }
}
