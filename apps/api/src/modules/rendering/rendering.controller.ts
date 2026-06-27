import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { RenderingService } from './rendering.service';
import { CurrentUser } from '../../common/decorators/request.decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('projects/:projectId/videos')
export class RenderingController {
  constructor(private readonly renderingService: RenderingService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.renderingService.getVideo(projectId, user.workspaceId);
  }

  @Get(':videoId/stream')
  stream(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('videoId', ParseUUIDPipe) videoId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.renderingService.streamVideo(
      projectId,
      videoId,
      user.workspaceId,
      req,
      res,
    );
  }
}
