import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/project.dto';
import { CurrentUser } from '../../common/decorators/request.decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/auth.decorators';
import { PaginationQueryDto, paginate, paginationArgs } from '../../common/dto/pagination.dto';
import { UserRole, ProjectStatus } from '@acs/database';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

class ProjectListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.OWNER)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(user.workspaceId, user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProjectListQueryDto,
  ) {
    const { skip, take, page, limit } = paginationArgs(query);
    return this.projectsService
      .findAll(user.workspaceId, skip, take, query.campaignId, query.status)
      .then(({ data, total }) => paginate(data, total, page, limit));
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.findOne(user.workspaceId, id);
  }

  @Post(':id/approve')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.OWNER)
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.approve(user.workspaceId, user.id, id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.OWNER)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.cancel(user.workspaceId, user.id, id);
  }

  @Post(':id/resume')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.OWNER)
  resume(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.resume(user.workspaceId, user.id, id);
  }

  @Post(':id/retry-render')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.OWNER)
  retryRender(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.retryRender(user.workspaceId, user.id, id);
  }
}
