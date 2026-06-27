import { Body, Controller, Patch, Post } from '@nestjs/common';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { CurrentUser } from '../../common/decorators/request.decorators';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/auth.decorators';
import { UserRole } from '@acs/database';
import { UsersService } from '../users/users.service';

class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}

@Controller('auth')
export class AuthExtensionsController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Patch('password')
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('invite')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  invite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteMemberDto,
  ) {
    return this.usersService.inviteMember(user.workspaceId, dto.email, dto.role);
  }
}
