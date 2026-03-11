import { Request, Response, NextFunction } from 'express';
import { SessionService, CreateSessionData, SessionResponse } from './session.service';
import { validateBody } from '../../middleware/validate';
import { z } from 'zod';

export class SessionController {
  constructor(private sessionService: SessionService) {}

  /**
   * Create a new session
   */
  createSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as CreateSessionData;
      
      const sessionResponse = await this.sessionService.createSession(data);

      res.json({
        success: true,
        data: sessionResponse,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get session by token
   */
  getSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Session token is required',
          },
        });
      }

      const session = await this.sessionService.findByToken(token as string);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found or expired',
          },
        });
      }

      res.json({
        success: true,
        data: { session },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user sessions
   */
  getUserSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { limit } = req.query;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
          },
        });
      }

      const sessions = await this.sessionService.findByUser(
        userId as string, 
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: { sessions: sessions },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update session last access
   */
  updateSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      
      await this.sessionService.updateLastAccess(token as string);

      res.json({
        success: true,
        message: 'Session updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete session
   */
  deleteSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      
      await this.sessionService.deleteSession(token as string);

      res.json({
        success: true,
        message: 'Session deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete all user sessions
   */
  deleteUserSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
          },
        });
      }

      await this.sessionService.deleteUserSessions(userId as string);

      res.json({
        success: true,
        message: 'All user sessions deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get session analytics
   */
  getSessionAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
          },
        });
      }

      const analytics = await this.sessionService.getSessionAnalytics(userId as string);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clean expired sessions
   */
  cleanExpiredSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.sessionService.deleteExpiredSessions();

      res.json({
        success: true,
        message: 'Expired sessions cleaned successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
