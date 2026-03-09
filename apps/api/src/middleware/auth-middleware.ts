import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserService, TokenPayload } from '../modules/user/user.service';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  tenantId?: string;
}

export class AuthMiddleware {
  constructor(private userService: UserService) {}

  /**
   * JWT authentication middleware
   */
  authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization header is required',
          },
        });
      }

      // Extract token from "Bearer <token>" format
      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN_FORMAT',
            message: 'Authorization header must be in format "Bearer <token>"',
          },
        });
      }

      // Verify token
      const decoded = this.userService.verifyToken(token) as TokenPayload;
      
      // Attach user info to request
      req.user = decoded;
      req.tenantId = decoded.tenantId;

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    }
  };

  /**
   * Optional authentication middleware (doesn't fail if no token)
   */
  optionalAuthenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        // No token provided, continue
        return next();
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return next();
      }

      try {
        const decoded = this.userService.verifyToken(token) as TokenPayload;
        req.user = decoded;
        req.tenantId = decoded.tenantId;
      } catch (error) {
        // Invalid token, continue without authentication
        next();
      }

      next();
    } catch (error) {
      next();
    }
  };

  /**
   * Role-based authorization middleware
   */
  requireRole = (requiredRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const hasRequiredRole = requiredRoles.includes(user.role);
      
      if (!hasRequiredRole) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `Required roles: ${requiredRoles.join(', ')}. User role: ${user.role}`,
          },
        });
      }

      next();
    };
  };

  /**
   * Admin role middleware
   */
  requireAdmin = this.requireRole(['ADMIN']);

  /**
   * Staff role middleware
   */
  requireStaff = this.requireRole(['ADMIN', 'STAFF']);

  /**
   * Self or admin role middleware
   */
  requireSelfOrAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          },
        });
    }

    // Allow users to access their own data or admins
    const canAccess = user.role === 'ADMIN' || user.id === req.params.userId;
    
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You can only access your own data or admin access is required',
        },
      });
    }

    next();
  };

  /**
   * Rate limiting middleware
   */
  rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const now = Date.now();
      
      if (!requests.has(clientId)) {
        requests.set(clientId, { count: 1, resetTime: now });
      }

      const requestData = requests.get(clientId);
      
      if (requestData && now - requestData.resetTime < windowMs) {
        requestData.count++;
        
        if (requestData.count > maxRequests) {
          return res.status(429).json({
            success: false,
            error: {
              code: 'TOO_MANY_REQUESTS',
              message: 'Too many requests. Please try again later.',
            },
            headers: {
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': Math.max(0, maxRequests - requestData.count).toString(),
              'X-RateLimit-Reset': new Date(requestData.resetTime + windowMs).toISOString(),
            },
          });
        }
      } else {
        // Reset window if expired
        requests.set(clientId, { count: 1, resetTime: now });
      }

      next();
    };
  };

  /**
   * Password strength validation
   */
  validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain only letters and numbers');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  /**
   * Check if user consent is required for booking
   */
  requireBookingConsent = (req: Request, res: Response, next: NextFunction) => {
    const { consentGiven } = req.body;
    
    if (!consentGiven) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONSENT_REQUIRED',
          message: 'Consent must be given before booking',
        },
      });
    }

    // Store consent timestamp
    req.consentTimestamp = new Date().toISOString();
    
    next();
  };
}
