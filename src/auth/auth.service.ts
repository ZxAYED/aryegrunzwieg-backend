import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CustomerStatus, Role, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { generateOtpEmailTemplate } from '../utils/generateOtpEmailTemplate';
import { sendResponse } from '../utils/sendResponse';
import { sendVerificationEmail } from '../utils/sendVerificationEmail';

type SignupParams = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  password: string;
};

type SignupTechnicianParams = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(params: SignupParams) {
    const existing = await this.prisma.user.findUnique({
      where: { email: params.email },
      select: {
        id: true,
        isVerified: true,
        isBlocked: true,
        isDeleted: true,
      },
    });

    if (existing) {
      if (existing.isBlocked) throw new ConflictException('User is blocked');
      if (existing.isDeleted) throw new ConflictException('User is deleted');
      if (existing.isVerified) {
        throw new ConflictException('Email already registered');
      }

      const otp = this.generateOtp();
      const otpExpiry = this.getOtpExpiry();

      await this.prisma.user.update({
        where: { email: params.email },
        data: {
          registrationOtp: otp,
          registrationOtpExpireIn: otpExpiry,
          registrationOtpAttempts: 0,
        },
      });

      await this.sendOtpEmail(params.email, otp, 'Verify your Elite account');

      return sendResponse(
        'Verification OTP sent. Check your email to verify your account.',
      );
    }

    const passwordHash = await bcrypt.hash(params.password, 12);
    const otp = this.generateOtp();
    const otpExpiry = this.getOtpExpiry();

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: params.email,
          passwordHash,
          role: Role.CUSTOMER,
          isVerified: false,
          registrationOtp: otp,
          registrationOtpExpireIn: otpExpiry,
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          customerCode: this.generateCustomerCode(),
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email,
          phone: params.phone,
          status: CustomerStatus.ACTIVE,
        },
        select: { id: true },
      });

      await tx.address.create({
        data: {
          customerId: customer.id,
          addressLine: params.address,
          apartment: params.apt,
          city: params.city,
          state: params.state,
          zip: params.zip,
        },
      });

      return user;
    });

    await this.sendOtpEmail(params.email, otp, 'Verify your Elite account');

    return sendResponse(
      'Signup successful. Check your email for verification OTP.',
      { user: result },
    );
  }

  async signupTechnician(params: SignupTechnicianParams) {
    const existing = await this.prisma.user.findUnique({
      where: { email: params.email },
      select: {
        id: true,
        isVerified: true,
        isBlocked: true,
        isDeleted: true,
      },
    });

    if (existing) {
      if (existing.isBlocked) throw new ConflictException('User is blocked');
      if (existing.isDeleted) throw new ConflictException('User is deleted');
      if (existing.isVerified) {
        throw new ConflictException('Email already registered');
      }

      const otp = this.generateOtp();
      const otpExpiry = this.getOtpExpiry();

      await this.prisma.user.update({
        where: { email: params.email },
        data: {
          registrationOtp: otp,
          registrationOtpExpireIn: otpExpiry,
          registrationOtpAttempts: 0,
        },
      });

      await this.sendOtpEmail(params.email, otp, 'Verify your Elite account');

      return sendResponse(
        'Verification OTP sent. Check your email to verify your account.',
      );
    }

    const passwordHash = await bcrypt.hash(params.password, 12);
    const otp = this.generateOtp();
    const otpExpiry = this.getOtpExpiry();
    const fullName = `${params.firstName} ${params.lastName}`.trim();

    const user = await this.prisma.user.create({
      data: {
        email: params.email,
        passwordHash,
        role: Role.TECHNICIAN,
        isVerified: false,
        registrationOtp: otp,
        registrationOtpExpireIn: otpExpiry,
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    await this.prisma.technician.create({
      data: {
        userId: user.id,
        name: fullName,
        email: params.email,
        phone: params.phone,
        isVerified: true,
      },
    });

    return sendResponse('Technician signup successful.', { user });
  }

  async resendRegistrationOtp(params: { email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: params.email },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) {
      throw new ConflictException('User already verified');
    }
    if (user.isBlocked) throw new ConflictException('User is blocked');
    if (user.isDeleted) throw new ConflictException('User is deleted');

    const otp = this.generateOtp();
    const otpExpiry = this.getOtpExpiry();

    await this.prisma.user.update({
      where: { email: params.email },
      data: {
        registrationOtp: otp,
        registrationOtpExpireIn: otpExpiry,
        registrationOtpAttempts: 0,
      },
    });

    await this.sendOtpEmail(params.email, otp, 'Verify your Elite account');

    return sendResponse(
      'Verification OTP resend successfully. Check your email to verify your account.',
    );
  }

  async verifyRegistrationOtp(params: { email: string; otp: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: params.email },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new ConflictException('User already verified');
    if (user.isBlocked) throw new ConflictException('User is blocked');
    if (user.isDeleted) throw new ConflictException('User is deleted');

    if (user.registrationOtpAttempts >= 5) {
      throw new ForbiddenException('Too many OTP attempts. Please resend OTP.');
    }

    const now = Date.now();
    const expiresAt = user.registrationOtpExpireIn?.getTime() ?? 0;
    if (!user.registrationOtp || expiresAt <= now) {
      throw new ConflictException('OTP expired. Please resend OTP.');
    }

    if (user.registrationOtp !== params.otp) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { registrationOtpAttempts: { increment: 1 } },
      });
      throw new ConflictException('Invalid OTP');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        registrationOtp: null,
        registrationOtpExpireIn: null,
        registrationOtpAttempts: 0,
      },
    });

    return sendResponse('Account verified successfully');
  }

  async login(params: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: params.email },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isVerified) {
      throw new ConflictException('User not verified. Please verify first.');
    }
    if (user.isBlocked) throw new ConflictException('User is blocked');
    if (user.isDeleted) throw new ConflictException('User is deleted');

    const ok = await bcrypt.compare(params.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid password');

    const safeUser = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const refreshTokenExpiresAt = this.getRefreshExpiresAt();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt,
      },
    });

    return sendResponse('Login successful', {
      user: safeUser,
      accessToken: await this.signAccessToken(safeUser),
      refreshToken,
    });
  }

  async forgotPassword(params: { email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: params.email },
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.isVerified) {
      throw new ConflictException('User not verified. Please verify first.');
    }
    if (user.isBlocked) throw new ConflictException('User is blocked');
    if (user.isDeleted) throw new ConflictException('User is deleted');

    const otp = this.generateOtp();
    const otpExpiry = this.getOtpExpiry();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: otp,
        resetOtpExpireIn: otpExpiry,
        resetOtpAttempts: 0,
      },
    });

    await this.sendOtpEmail(params.email, otp, 'Reset your Elite password');

    return sendResponse(
      'Password reset OTP sent. Check your email. You have 10 minutes to reset.',
    );
  }

  async resendForgotPasswordOtp(params: { email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: params.email },
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.isVerified) {
      throw new ConflictException('User not verified. Please verify first.');
    }
    if (user.isBlocked) throw new ConflictException('User is blocked');
    if (user.isDeleted) throw new ConflictException('User is deleted');

    const otp = this.generateOtp();
    const otpExpiry = this.getOtpExpiry();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: otp,
        resetOtpExpireIn: otpExpiry,
        resetOtpAttempts: 0,
      },
    });

    await this.sendOtpEmail(params.email, otp, 'Reset your Elite password');

    return sendResponse(
      'Password reset OTP resent. Check your email. You have 10 minutes to reset.',
    );
  }

  async resetPassword(params: {
    email: string;
    otp: string;
    newPassword: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { email: params.email },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.isBlocked) throw new ConflictException('User is blocked');
    if (user.isDeleted) throw new ConflictException('User is deleted');

    if (user.resetOtpAttempts >= 5) {
      throw new ForbiddenException('Too many OTP attempts. Please resend OTP.');
    }

    const now = Date.now();
    const expiresAt = user.resetOtpExpireIn?.getTime() ?? 0;
    if (!user.resetOtp || expiresAt <= now) {
      throw new ConflictException('OTP expired. Please resend OTP.');
    }

    if (user.resetOtp !== params.otp) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { resetOtpAttempts: { increment: 1 } },
      });
      throw new ConflictException('Invalid OTP');
    }

    const passwordHash = await bcrypt.hash(params.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetOtp: null,
        resetOtpExpireIn: null,
        resetOtpAttempts: 0,
      },
    });

    return sendResponse('Password reset successfully');
  }

  async changePassword(
    params: { oldPassword: string; newPassword: string },
    user?: User,
  ) {
    if (!user) throw new UnauthorizedException('Unauthorized user');

    const fresh = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh) throw new UnauthorizedException('Unauthorized user');
    if (fresh.isBlocked) throw new ConflictException('User is blocked');
    if (fresh.isDeleted) throw new ConflictException('User is deleted');

    const ok = await bcrypt.compare(params.oldPassword, fresh.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid password');

    const passwordHash = await bcrypt.hash(params.newPassword, 12);

    await this.prisma.user.update({
      where: { id: fresh.id },
      data: { passwordHash },
    });

    return sendResponse('Password changed successfully');
  }

  async refreshToken(params: { refreshToken: string }) {
    const refreshTokenHash = this.hashToken(params.refreshToken);
    const user = await this.prisma.user.findUnique({
      where: { refreshTokenHash },
    });

    if (!user || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.refreshTokenExpiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const nextRefreshToken = this.generateRefreshToken();
    const nextRefreshTokenHash = this.hashToken(nextRefreshToken);
    const refreshTokenExpiresAt = this.getRefreshExpiresAt();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: nextRefreshTokenHash,
        refreshTokenExpiresAt,
      },
    });

    return sendResponse('Token refreshed successfully', {
      accessToken: await this.signAccessToken(safeUser),
      refreshToken: nextRefreshToken,
    });
  }

  private async sendOtpEmail(email: string, otp: string, title: string) {
    const html = generateOtpEmailTemplate({
      appName: 'Elite',
      title,
      message: 'Use the OTP below to complete your request.',
      otp,
      primaryColor: '#C0CFD0',
    });

    await sendVerificationEmail(this.configService, email, title, html);
  }

  private generateOtp() {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  private getOtpExpiry() {
    return new Date(Date.now() + 10 * 60 * 1000);
  }

  private generateCustomerCode() {
    return `CUST-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private generateRefreshToken() {
    return crypto.randomBytes(48).toString('base64url');
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private getRefreshExpiresAt() {
    const days = Number(
      this.configService.get<string>('REFRESH_TOKEN_TTL_DAYS') ?? '30',
    );
    const ttlDays = Number.isFinite(days) && days > 0 ? days : 30;
    return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  }

  private async signAccessToken(user: {
    id: string;
    email: string;
    role: Role;
  }) {
    return this.jwt.signAsync({
      id: user.id,
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}
