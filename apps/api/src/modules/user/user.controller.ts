import { Request, Response, NextFunction } from 'express';
import { UserService, LoginData, AuthResponse } from './user.service';
import { UserRepository } from './user.repository';
import { UserRole } from '@prisma/client';

export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Authenticate user (login)
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, tenantSlug } = req.body as LoginData;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Email and password are required',
          },
        });
      }

      const authResponse = await this.userService.authenticateUser({ email, password, tenantSlug });

      // Update last login
      await this.userService.updateLastLogin(authResponse.user.id);

      res.json({
        success: true,
        data: {
          user: authResponse.user,
          token: authResponse.token,
          refreshToken: authResponse.refreshToken,
          expiresAt: authResponse.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh access token
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required',
          },
        });
      }

      const authResponse = await this.userService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: {
          user: authResponse.user,
          token: authResponse.token,
          refreshToken: authResponse.refreshToken,
          expiresAt: authResponse.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user profile
   */
  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const user = await this.userService.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user profile
   */
  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const { name, email } = req.body;
      const updateData: any = {};

      if (name) updateData.name = name;
      if (email) updateData.email = email;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_UPDATE_DATA',
            message: 'At least one field (name, email) must be provided',
          },
        });
      }

      const updatedUser = await this.userService.updateUser(userId, updateData);

      res.json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update password
   */
  updatePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PASSWORDS',
            message: 'Current password and new password are required',
          },
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'New password must be at least 8 characters long',
          },
        });
      }

      await this.userService.updatePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get users by tenant (admin only)
   */
  getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;
      const tenantId = req.tenantId;

      if (!currentUserId || currentUserRole !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
          },
        });
      }

      const roleStr = typeof req.query.role === 'string' ? req.query.role : req.query.role?.[0];
      const limitStr = typeof req.query.limit === 'string' ? req.query.limit : req.query.limit?.[0];

      const users = await this.userService.getUsersByTenant(
        tenantId,
        {
          role: roleStr ? roleStr as UserRole : undefined,
          limit: limitStr ? parseInt(limitStr) : undefined
        }
      );

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create user (admin only)
   */
  createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;
      const tenantId = req.tenantId;

      if (!currentUserId || currentUserRole !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
          },
        });
      }

      const { email, password, name, role } = req.body;

      if (!email || !password || !name || !role) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'Email, password, name, and role are required',
          },
        });
      }

      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: 'Invalid role specified',
          },
        });
      }

      const newUser = await this.userService.createUser({
        email,
        password,
        name,
        role: role as UserRole,
        tenantId,
      });

      res.status(201).json({
        success: true,
        data: newUser,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user role (admin only)
   */
  updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;
      const tenantId = req.tenantId;

      if (!currentUserId || currentUserRole !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
          },
        });
      }

      const { userId, role } = req.body;

      if (!userId || !role) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'User ID and role are required',
          },
        });
      }

      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: 'Invalid role specified',
          },
        });
      }

      const updatedUser = await this.userService.updateUser(userId, { role: role as UserRole });

      res.json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete user (admin only)
   */
  deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;
      const tenantId = req.tenantId;

      if (!currentUserId || currentUserRole !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
          },
        });
      }

      const userIdStr = typeof req.params.userId === 'string' ? req.params.userId : req.params.userId?.[0];

      if (!userIdStr) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
          },
        });
      }

      await this.userService.deleteUser(userIdStr);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search users (admin only)
   */
  searchUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;
      const tenantId = req.tenantId;

      if (!currentUserId || currentUserRole !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required',
          },
        });
      }

      const qStr = typeof req.query.q === 'string' ? req.query.q : req.query.q?.[0];
      if (!qStr) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_QUERY',
            message: 'Search query is required',
          },
        });
      }

      const limitStr = typeof req.query.limit === 'string' ? req.query.limit : req.query.limit?.[0];
      const users = await this.userService.getUsersByTenant(tenantId);
      const filteredUsers = users.filter(user => 
        (user.firstName && user.firstName.toLowerCase().includes(qStr.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(qStr.toLowerCase())) ||
        user.email.toLowerCase().includes(qStr.toLowerCase())
      );

      const limitedUsers = filteredUsers.slice(0, limitStr ? parseInt(limitStr) : 10);

      res.json({
        success: true,
        data: limitedUsers,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user
   */
  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // In a real implementation, you might want to:
      // 1. Invalidate the token on the server side
      // 2. Add the token to a blacklist
      // 3. Clear any session data
      
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
