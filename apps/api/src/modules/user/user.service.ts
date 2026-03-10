import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, UserRole } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { UserRepository } from './user.repository';
import { TenantRepository } from '../tenant/tenant.repository';

export interface LoginData {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantSlug: string;
  iat?: number;
  exp?: number;
}

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private tenantRepository: TenantRepository
  ) {}

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(loginData: LoginData): Promise<AuthResponse> {
    const { email, password, tenantSlug } = loginData;

    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Verify tenant access if tenantSlug provided
    if (tenantSlug) {
      // Find tenant by slug
      const tenant = await this.tenantRepository.findBySlug(tenantSlug!);
      if (!tenant || tenant.id !== user.tenantId) {
        throw new Error('Tenant access denied');
      }
    }

    // Find tenant by ID
    const tenant = await this.tenantRepository.findById(user.tenantId);
    if (!tenant || !tenant.isActive) {
      throw new Error('Tenant is not active');
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: tenant.slug,
    };

    // @ts-ignore
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });

    // @ts-ignore
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Calculate expiration
    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
    const expiresAt = new Date();
    const [hours] = expiresIn.match(/(\d+)h/) || ['1'];
    expiresAt.setHours(expiresAt.getHours() + parseInt(hours[0]));

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    // Remove password from user object
    // @ts-ignore
    const userWithoutPassword: Omit<User, 'passwordHash'> = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      deletedAt: user.deletedAt,
      mfaEnabled: user.mfaEnabled,
      mfaSecret: user.mfaSecret,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      preferences: user.preferences,
      lastSeenAt: user.lastSeenAt,
      deviceId: user.deviceId,
      smsVerificationCode: user.smsVerificationCode,
      smsCodeExpiresAt: user.smsCodeExpiresAt,
      emailVerificationCode: user.emailVerificationCode,
      emailCodeExpiresAt: user.emailCodeExpiresAt,
      recoveryCodes: user.recoveryCodes,
      recoveryCodesGeneratedAt: user.recoveryCodesGeneratedAt,
    };

    return {
      user: userWithoutPassword,
      token,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // @ts-ignore
    const tenant = await TenantRepository.findById(user.tenantId);
      if (!tenant || !tenant.isActive) {
        throw new Error('Tenant is not active');
      }

      // Generate new tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantSlug: tenant.slug,
      };

      // @ts-ignore
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      });

      // @ts-ignore
      const newRefreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
      );

      // Calculate expiration
      const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
      const expiresAt = new Date();
      const [hours] = expiresIn.match(/(\d+)h/) || ['1'];
      expiresAt.setHours(expiresAt.getHours() + parseInt(hours[0]));

      // @ts-ignore
      const { password: _, ...userWithoutPassword } = user;

      // @ts-ignore
      return {
        user: userWithoutPassword,
        token,
        refreshToken: newRefreshToken,
        expiresAt,
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Create new user
   */
  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    tenantId: string;
  }): Promise<Omit<User, 'password'>> {
    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create user
    const user = await this.userRepository.create({
      ...userData,
      password: hashedPassword,
    });

    // @ts-ignore
    // Remove password from user object
    // @ts-ignore
      const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.userRepository.updatePassword(userId, hashedNewPassword);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    // @ts-ignore
      const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get users by tenant
   */
  async getUsersByTenant(tenantId: string, role?: UserRole): Promise<Omit<User, 'password'>[]> {
    const users = await this.userRepository.findByTenant(tenantId, role);
    
    return users.map(user => {
      // @ts-ignore
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    // @ts-ignore
    updateData: Partial<Pick<User, 'name' | 'email' | 'role'>>
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.update(userId, updateData);
    
    // @ts-ignore
      const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string): Promise<void> {
    await this.userRepository.softDelete(userId);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Update last login
   */
  async updateLastLogin(userId: string): Promise<void> {
    // @ts-ignore
    await this.userRepository.updateLastLogin(userId);
  }

  /**
   * Check if user has required role
   */
  hasRequiredRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    return requiredRoles.includes(userRole);
  }

  /**
   * Check if user can access tenant
   */
  async canAccessTenant(userId: string, tenantId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return false;
    }

    return user.tenantId === tenantId;
  }
}
