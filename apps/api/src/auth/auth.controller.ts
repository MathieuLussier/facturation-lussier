import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AuthTokens, MeResponse } from '@facturation/core';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import type { AuthUser } from '@facturation/core';

const REFRESH_COOKIE = 'refresh_token';
// Path '/' : le cookie doit être renvoyé par le navigateur sur les requêtes
// proxifiées /api/auth/refresh et /api/auth/logout (le navigateur voit le path
// côté origine web, pas le path interne de l'API). '/auth' ne matcherait pas.
const COOKIE_PATH = '/';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // POST /auth/login
  // ---------------------------------------------------------------------------

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokens> {
    const { tokens, refreshToken } = await this.authService.login(dto.email, dto.password);

    this.setRefreshCookie(res, refreshToken);

    return tokens;
  }

  // ---------------------------------------------------------------------------
  // POST /auth/refresh
  // ---------------------------------------------------------------------------

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renouveler les tokens' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokens> {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;

    if (!rawToken) {
      throw new UnauthorizedException('Cookie refresh_token manquant');
    }

    const { tokens, refreshToken } = await this.authService.refresh(rawToken);

    this.setRefreshCookie(res, refreshToken);

    return tokens;
  }

  // ---------------------------------------------------------------------------
  // POST /auth/logout
  // ---------------------------------------------------------------------------

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Déconnexion' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;

    if (rawToken) {
      await this.authService.logout(rawToken);
    }

    this.clearRefreshCookie(res);
  }

  // ---------------------------------------------------------------------------
  // GET /auth/me
  // ---------------------------------------------------------------------------

  @Get('me')
  @ApiOperation({ summary: 'Utilisateur courant' })
  me(@CurrentUser() user: AuthUser): MeResponse {
    return user;
  }

  // ---------------------------------------------------------------------------
  // Helpers cookie
  // ---------------------------------------------------------------------------

  private setRefreshCookie(res: Response, token: string): void {
    const secure = this.config.get<string>('COOKIE_SECURE') === 'true';
    const maxAge = this.authService.refreshTtlSeconds * 1000;

    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: COOKIE_PATH,
      maxAge,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.cookie(REFRESH_COOKIE, '', {
      httpOnly: true,
      secure: this.config.get<string>('COOKIE_SECURE') === 'true',
      sameSite: 'lax',
      path: COOKIE_PATH,
      maxAge: 0,
    });
  }
}
