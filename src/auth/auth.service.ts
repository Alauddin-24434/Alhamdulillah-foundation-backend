import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserRole } from '../user/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './schemas/refresh-token.schema';

/* ================= TOKEN PAYLOAD ================= */

export interface TokenPayload {
  _id: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /* ================= TOKEN HELPERS ================= */

  private generateAccessToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });
  }

  private generateRefreshToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
  }

  private verifyRefreshToken(token: string): TokenPayload {
    return this.jwtService.verify(token, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });
  }

  /* ================= REGISTER ================= */

  async register(registerDto: RegisterDto) {
    const { email } = registerDto;

    const exists = await this.userModel.findOne({ email });
    if (exists) {
      throw new ConflictException('User already exists');
    }

    const user = await this.userModel.create({
      ...registerDto,
      role: UserRole.USER,
      permissions: [],
    });

    const payload: TokenPayload = {
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    await this.saveRefreshToken(user._id.toString(), refreshToken);

    return { user, accessToken, refreshToken };
  }

  /* ================= LOGIN ================= */

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    if (!password) {
      throw new BadRequestException('Password is required');
    }

    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLogin = new Date();
    await user.save();

    const payload: TokenPayload = {
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    await this.saveRefreshToken(user._id.toString(), refreshToken);

    return { user, accessToken, refreshToken };
  }

  /* ================= REFRESH ACCESS TOKEN ================= */

  async refreshAccessToken(refreshToken: string) {
    const tokenInDb = await this.refreshTokenModel.findOne({
      token: refreshToken,
    });

    if (!tokenInDb) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const payload = this.verifyRefreshToken(refreshToken);

    if (tokenInDb.userId.toString() !== payload._id) {
      throw new UnauthorizedException('Token mismatch');
    }

    const user = await this.userModel.findById(payload._id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = this.generateAccessToken({
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    });

    return { user, accessToken };
  }

  /* ================= LOGOUT ================= */

  async logout(refreshToken?: string) {
    if (!refreshToken) return;

    await this.refreshTokenModel.deleteOne({ token: refreshToken });
  }

  /* ================= HELPERS ================= */

  private async saveRefreshToken(userId: string, token: string) {
    // 🔥 one device = one token
    await this.refreshTokenModel.deleteMany({ userId });

    await this.refreshTokenModel.create({
      userId,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  async validateUser(userId: string) {
    return this.userModel.findById(userId);
  }
}