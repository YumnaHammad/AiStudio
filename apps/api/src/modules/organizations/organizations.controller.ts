import { Controller, Get } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CurrentUser } from '../../common/decorators/request.decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('workspace')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  getWorkspace(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.getWorkspace(user.workspaceId);
  }
}
