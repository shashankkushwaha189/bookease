import api from './client';
import type {
  ApiSuccessResponse,
  LoginRequest,
  LoginResponse
} from '../types/api';

export const authApi = {
  /**
   * User login
   */
  login: (credentials: LoginRequest) => 
    api.post<ApiSuccessResponse<LoginResponse>>('/auth/login', credentials),

  /**
   * User registration
   */
  register: (data: { 
    firstName: string; 
    lastName: string; 
    email: string; 
    password: string;
    tenantSlug?: string;
    phoneNumber?: string;
  }) => 
    api.post('/api/auth/register', data),

  /**
   * User logout
   */
  logout: () => 
    api.post('/auth/logout'),

  /**
   * Refresh token
   */
  refreshToken: () => 
    api.post('/auth/refresh'),

  /**
   * Get current user profile
   */
  getProfile: () => 
    api.get('/auth/profile'),

  /**
   * Update user profile
   */
  updateProfile: (data: Partial<LoginResponse['user']>) => 
    api.patch('/auth/profile', data),

  /**
   * Change password
   */
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    api.post('/auth/change-password', data),

  /**
   * Forgot password - send reset email
   */
  forgotPassword: (data: { email: string }) => 
    api.post('/auth/forgot-password', data),

  /**
   * Reset password with token
   */
  resetPassword: (data: { token: string; newPassword: string; confirmPassword: string }) => 
    api.post('/auth/reset-password', data),

  /**
   * Social login with Google
   */
  loginWithGoogle: (token: string) => 
    api.post('/auth/google', { token }),

  /**
   * Social login with GitHub
   */
  loginWithGitHub: (code: string) => 
    api.post('/auth/github', { code }),

  /**
   * Get Google OAuth URL
   */
  getGoogleAuthUrl: () => 
    api.get('/auth/google/url'),

  /**
   * Get GitHub OAuth URL
   */
  getGitHubAuthUrl: () => 
    api.get('/auth/github/url'),

  /**
   * Verify two-factor authentication code
   */
  verifyTwoFactor: (data: { token: string; code: string; method: 'totp' | 'email' | 'sms' }) => 
    api.post('/auth/verify-2fa', data),

  /**
   * Resend two-factor authentication code
   */
  resendTwoFactor: (token: string) => 
    api.post('/auth/resend-2fa', { token }),

  /**
   * Enable two-factor authentication
   */
  enableTwoFactor: (data: { method: 'totp' | 'email' | 'sms'; secret?: string }) => 
    api.post('/auth/enable-2fa', data),

  /**
   * Disable two-factor authentication
   */
  disableTwoFactor: (password: string) => 
    api.post('/auth/disable-2fa', { password }),

  /**
   * Generate backup codes
   */
  generateBackupCodes: () => 
    api.post('/auth/backup-codes'),

  /**
   * Upload avatar
   */
  uploadAvatar: (formData: FormData) => 
    api.post('/auth/upload-avatar', formData),

  /**
   * Delete avatar
   */
  deleteAvatar: () => 
    api.delete('/auth/avatar'),

  /**
   * Deactivate account
   */
  deactivateAccount: (data: { password: string }) => 
    api.post('/auth/deactivate', data),

  /**
   * Verify email with token
   */
  verifyEmail: (token: string) => 
    api.get(`/auth/verify-email/${token}`),

  /**
   * Resend verification email
   */
  resendVerificationEmail: (email: string) => 
    api.post('/auth/resend-verification', { email }),

  /**
   * Verify reset token
   */
  verifyResetToken: (token: string) => 
    api.get(`/auth/verify-reset-token/${token}`),
};
