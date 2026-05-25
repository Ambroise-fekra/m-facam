import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Sign in with family identifier + email + password' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('recover-identifier')
  @ApiOperation({ summary: 'Recover the family identifier(s) tied to an email' })
  recoverIdentifier(@Body() body: { email: string }) {
    return this.auth.recoverIdentifier(body.email ?? '');
  }

  @Get('invite-info')
  @ApiOperation({ summary: 'Greeting info for an invite token' })
  inviteInfo(@Query('identifier') identifier: string, @Query('token') token: string) {
    return this.auth.inviteInfo(identifier, token);
  }

  @Post('accept-invite')
  @ApiOperation({ summary: 'Member sets their own password from an invite and is logged in' })
  acceptInvite(@Body() body: { identifier: string; token: string; password: string }) {
    return this.auth.acceptInvite(body.identifier, body.token, body.password);
  }
}
