import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ArtifactsService } from './artifacts.service';
import { CurrentUser } from '../../common/decorators/request.decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

class ArtifactQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}

@Controller('projects/:projectId/artifacts')
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Get(':type')
  getArtifacts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('type') type: string,
    @Query() query: ArtifactQueryDto,
  ) {
    return this.artifactsService.getArtifacts(
      projectId,
      user.workspaceId,
      type,
      query.version,
    );
  }
}
