import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/auth.decorators';
import { CurrentUser } from '../../common/decorators/request.decorators';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@acs/database';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip);
  }

  @Public()
  @SkipThrottle()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
  ) {
    await this.auditService.log({
      workspaceId: user.workspaceId,
      userId: user.id,
      action: AuditAction.USER_LOGOUT,
      resource: 'user',
      resourceId: user.id,
      ipAddress: req.ip,
    });
    return this.authService.logout(user.id, body.refreshToken);
  }
}
