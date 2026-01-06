import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, type User } from '@prisma/client';
import { Public, Roles } from 'src/common/decorator/rolesDecorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';

import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupTechnicianDto } from './dto/signup-technician.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: SignupDto })
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Post('signup-technician')
  @ApiOperation({ summary: 'Register a new technician' })
  @ApiBearerAuth()
  @ApiBody({ type: SignupTechnicianDto })
  @UseGuards(AuthGuard)
  @Roles(Role.ADMIN)
  signupTechnician(@Body() dto: SignupTechnicianDto) {
    return this.auth.signupTechnician(dto);
  }

  @Public()
  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend registration OTP' })
  @ApiBody({ type: ResendOtpDto })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.auth.resendRegistrationOtp(dto);
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify registration OTP' })
  @ApiBody({ type: VerifyOtpDto })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyRegistrationOtp(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login and generate JWT tokens' })
  @ApiBody({ type: LoginDto })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Send password reset OTP' })
  @ApiBody({ type: ForgotPasswordDto })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Post('resend-forgot-otp')
  @ApiOperation({ summary: 'Resend password reset OTP' })
  @ApiBody({ type: ForgotPasswordDto })
  resendForgotPasswordOtp(@Body() dto: ForgotPasswordDto) {
    return this.auth.resendForgotPasswordOtp(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiBody({ type: ResetPasswordDto })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiBody({ type: ChangePasswordDto })
  changePassword(@Body() dto: ChangePasswordDto, @Req() req: { user?: User }) {
    return this.auth.changePassword(dto, req.user);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.auth.refreshToken(dto);
  }
}
