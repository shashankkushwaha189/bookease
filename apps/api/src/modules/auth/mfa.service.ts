import crypto from 'crypto';
import speakeasy from 'speakeasy';
import { PrismaClient, User } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface MFASetupResponse {
  secret: string;
  backupCodes: string[];
  qrCode: string;
}

export interface MFAVerifyRequest {
  userId: string;
  token: string;
  code: string;
}

export interface MFADisableRequest {
  userId: string;
  token: string;
}

export interface MFAEnableRequest {
  userId: string;
  token: string;
  secret?: string;
}

export class MFAService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate TOTP secret for user
   */
  async generateMFASecret(userId: string): Promise<MFASetupResponse> {
    const secret = speakeasy.generateSecret({
      name: `BookEase-${userId}`,
      issuer: 'BookEase',
      length: 32,
    });

    const backupCodes = this.generateBackupCodes();
    const qrCode = speakeasy.qrCodeDataURL({
      secret: secret.base32,
      label: `BookEase (${userId})`,
      issuer: 'BookEase',
    });

    // Store MFA secret in database
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret.base32,
      },
    });

    return {
      secret: secret.base32,
      backupCodes,
      qrCode: qrCode,
    };
  }

  /**
   * Verify TOTP token
   */
  async verifyMFA({ userId, token, code }: MFAVerifyRequest): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, mfaEnabled: true },
    });

    if (!user || !user.mfaSecret) {
      throw new Error('MFA not enabled for this user');
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
      time: 30,
    });

    // Check if code matches backup codes
    const isBackupCode = backupCodes.some(backupCode => backupCode === code);

    return verified || isBackupCode;
  }

  /**
   * Enable MFA for user
   */
  async enableMFA({ userId, token, secret }: MFAEnableRequest): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify the provided secret matches current setup
    if (secret && user.mfaSecret && user.mfaSecret !== secret) {
      throw new Error('Invalid MFA secret');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret || user.mfaSecret,
      },
    });
  }

  /**
   * Disable MFA for user
   */
  async disableMFA({ userId, token }: MFADisableRequest): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });
  }

  /**
   * Generate backup recovery codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
    }
    return codes;
  }

  /**
   * Check if user has MFA enabled
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    return user?.mfaEnabled || false;
  }

  /**
   * Generate SMS verification code
   */
  async generateSMSCode(userId: string, phoneNumber: string): Promise<string> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store SMS code in database (you would implement SMS service here)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneNumber,
        smsVerificationCode: code,
        smsCodeExpiresAt: expiresAt,
      },
    });

    return code;
  }

  /**
   * Verify SMS code
   */
  async verifySMSCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.smsVerificationCode || !user.smsCodeExpiresAt) {
      return false;
    }

    // Check if code is expired
    if (new Date() > user.smsCodeExpiresAt) {
      return false;
    }

    return user.smsVerificationCode === code;
  }

  /**
   * Send email verification code
   */
  async sendEmailVerificationCode(userId: string, email: string): Promise<string> {
    const code = crypto.randomBytes(3).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationCode: code,
        emailCodeExpiresAt: expiresAt,
      },
    });

    // Here you would implement email sending service
    console.log(`Email verification code for ${email}: ${code}`);

    return code;
  }

  /**
   * Verify email verification code
   */
  async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.emailVerificationCode || !user.emailCodeExpiresAt) {
      return false;
    }

    // Check if code is expired
    if (new Date() > user.emailCodeExpiresAt) {
      return false;
    }

    return user.emailVerificationCode === code;
  }

  /**
   * Generate recovery codes
   */
  async generateRecoveryCodes(userId: string): Promise<string[]> {
    const codes = this.generateBackupCodes();
    
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        recoveryCodes: codes,
        recoveryCodesGeneratedAt: new Date(),
      },
    });

    return codes;
  }

  /**
   * Verify recovery code
   */
  async verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.recoveryCodes || !user.recoveryCodesGeneratedAt) {
      return false;
    }

    // Check if codes are expired (24 hours)
    const expirationTime = new Date(user.recoveryCodesGeneratedAt.getTime() + 24 * 60 * 60 * 1000);
    if (new Date() > expirationTime) {
      return false;
    }

    return user.recoveryCodes.includes(code);
  }
}
