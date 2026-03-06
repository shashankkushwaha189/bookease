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
};
