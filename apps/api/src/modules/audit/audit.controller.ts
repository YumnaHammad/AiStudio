import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser } from '../../common/decorators/request.decorators';
import { Roles } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PaginationQueryDto, paginate, paginationArgs } from '../../common/dto/pagination.dto';
import { UserRole } from '@acs/database';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    const { skip, take, page, limit } = paginationArgs(query);
    const { data, total } = await this.auditService.findByWorkspace(
      user.workspaceId,
      skip,
      take,
    );
    return paginate(data, total, page, limit);
  }
}
