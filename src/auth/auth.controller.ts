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

import { AuthService } from './auth.service';
import { StatsService } from '../stats/stats.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

export interface JwtUser {
  _id: string;
  email: string;
  role: string;
  permissions?: string[];
}

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
    console.log('hi');
    const { user, accessToken, refreshToken } =
      await this.authService.register(registerDto);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // dev → false
      sameSite: 'lax', // 🔥 KEY FIX
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      message: 'Registration successful',
      data: {
        user,
        accessToken: accessToken,
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

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // dev → false
      sameSite: 'lax', // 🔥 KEY FIX
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });




    return {
      success: true,
      message: 'Login successful',
      data: {
        user,
        accessToken: accessToken,
      },
    };
  }

  /* ================= ME ================= */
 
@Get('me')
@UseGuards(JwtAuthGuard)
async me(@ReqDecorator() req: Request) {
  const user = req.user as JwtUser;
  const refreshToken = (req.cookies as Record<string, string>)?.refreshToken;

  if (!refreshToken) {
    throw new UnauthorizedException('Refresh token missing');
  }

  const { accessToken, user: refreshedUser } =
    await this.authService.refreshAccessToken(refreshToken);

  return {
    success: true,
    data: {
      user: refreshedUser,
      accessToken,
    },
  };
}

  /* ================= REFRESH TOKEN ================= */
  @Post('refresh-token')
  async refreshToken(@Req() req: Request) {
    const refreshToken = (req.cookies as Record<string, string>)?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const { accessToken, user } =
      await this.authService.refreshAccessToken(refreshToken);

    return {
      success: true,
      data: {
        user,
        accessToken: accessToken,
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
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }
}
