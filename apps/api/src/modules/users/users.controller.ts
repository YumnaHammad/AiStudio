import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/request.decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/auth.decorators';
import { UserRole } from '@acs/database';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  @Get('members')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.EDITOR, UserRole.VIEWER)
  listMembers(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listWorkspaceMembers(user.workspaceId);
  }
}
