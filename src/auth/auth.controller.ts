import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
  Get,
  UseGuards,
  Request as ReqDecorator,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { StatsService } from '../stats/stats.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

export interface JwtUser {
  _id: string;
  email: string;
  role: string;
  permissions?: string[];
}

const cookieOptions = {
  httpOnly: true,
  secure: false, // prod এ true
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly statsService: StatsService,
  ) {}

  /* ================= REGISTER ================= */

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.register(registerDto);

    res.cookie('refreshToken', refreshToken, cookieOptions);

    return {
      success: true,
      message: 'Registration successful',
      data: {
        user,
        accessToken,
      },
    };
  }

  /* ================= LOGIN ================= */

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.login(loginDto);

    res.cookie('refreshToken', refreshToken, cookieOptions);

    return {
      success: true,
      message: 'Login successful',
      data: {
        user,
        accessToken,
      },
    };
  }

  /* ================= ME ================= */

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@ReqDecorator() req: Request) {
    return {
      success: true,
      data: req.user,
    };
  }

  /* ================= REFRESH TOKEN ================= */

  @Post('refresh-token')
  async refreshToken(@Req() req: Request) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const { user, accessToken } =
      await this.authService.refreshAccessToken(refreshToken);

    return {
      success: true,
      data: {
        user,
        accessToken,
      },
    };
  }

  /* ================= STATS ================= */

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@ReqDecorator() req: Request) {
    const user = req.user as JwtUser;

    const stats =
      user.role === 'SuperAdmin' || user.role === 'Admin'
        ? await this.statsService.getAdminStats()
        : await this.statsService.getUserStats(user._id);

    return {
      success: true,
      data: stats,
    };
  }

  /* ================= LOGOUT ================= */

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    await this.authService.logout(refreshToken);

    res.clearCookie('refreshToken', cookieOptions);

    return {
      message: 'Logged out successfully',
    };
  }
}