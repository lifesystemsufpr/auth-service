import {
  Controller,
  Post,
  UseGuards,
  Body,
  Res,
  Req,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { RequestUser } from './decorators/request-user.decorator';
import { Payload } from './interfaces/auth.interface';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordRecoveryDto } from './dto/request-password-recovery.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @RequestUser() user: Payload,
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signIn(user, loginDto.keepMeLoggedIn);
    this.setRefreshCookie(res, tokens.refresh_token, loginDto.keepMeLoggedIn);
    return { access_token: tokens.access_token };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const oldToken = req.cookies[COOKIE_NAME] as string | undefined;
    if (!oldToken) {
      throw new UnauthorizedException('Nenhum refresh token encontrado');
    }

    try {
      const { user, persistent } = await this.authService.validateRefreshToken(oldToken);
      const tokens = await this.authService.signIn(user, persistent);
      this.setRefreshCookie(res, tokens.refresh_token, persistent);
      return { access_token: tokens.access_token };
    } catch {
      res.clearCookie(COOKIE_NAME, { path: '/' });
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
  }

  @Post('password-recovery')
  @Public()
  @HttpCode(HttpStatus.OK)
  requestPasswordRecovery(@Body() dto: RequestPasswordRecoveryDto) {
    return this.authService.initiatePasswordRecovery(dto.email);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  private setRefreshCookie(res: Response, token: string, persistent?: boolean) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      ...(persistent ? { maxAge: THIRTY_DAYS_MS } : {}),
    });
  }
}
