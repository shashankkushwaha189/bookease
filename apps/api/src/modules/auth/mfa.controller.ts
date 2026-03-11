import { Request, Response, NextFunction } from 'express';
import { MFAService, MFASetupResponse, MFAVerifyRequest, MFADisableRequest, MFAEnableRequest } from './mfa.service';
import { validateBody } from '../../middleware/validate';
import { z } from 'zod';

export class MFAController {
  constructor(private mfaService: MFAService) {}

  /**
   * Generate MFA secret for user
   */
  generateSecret = async (req: Request, res: Response, next: NextFunction) => {
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

      const mfaSetup = await this.mfaService.generateMFASecret(userId as string);

      res.json({
        success: true,
        data: mfaSetup,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify MFA token
   */
  verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, token, code } = req.body;
      
      const isValid = await this.mfaService.verifyMFA({ userId, token, code });

      if (isValid) {
        res.json({
          success: true,
          message: 'MFA verification successful',
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_MFA_CODE',
            message: 'Invalid or expired MFA code',
          },
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Enable MFA for user
   */
  enableMFA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, token, secret } = req.body;
      
      await this.mfaService.enableMFA({ userId, token, secret });

      res.json({
        success: true,
        message: 'MFA enabled successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Disable MFA for user
   */
  disableMFA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, token } = req.body;
      
      await this.mfaService.disableMFA({ userId, token });

      res.json({
        success: true,
        message: 'MFA disabled successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate SMS verification code
   */
  generateSMSCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, phoneNumber } = req.body;
      
      if (!userId || !phoneNumber) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'User ID and phone number are required',
          },
        });
      }

      const code = await this.mfaService.generateSMSCode(userId, phoneNumber);

      res.json({
        success: true,
        data: { code },
        message: 'SMS verification code sent',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify SMS code
   */
  verifySMSCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, code } = req.body;
      
      const isValid = await this.mfaService.verifySMSCode(userId, code);

      if (isValid) {
        res.json({
          success: true,
          message: 'SMS verification successful',
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SMS_CODE',
            message: 'Invalid or expired SMS code',
          },
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Send email verification code
   */
  sendEmailVerificationCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, email } = req.body;
      
      if (!userId || !email) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'User ID and email are required',
          },
        });
      }

      const code = await this.mfaService.sendEmailVerificationCode(userId, email);

      res.json({
        success: true,
        data: { code },
        message: 'Email verification code sent',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify email verification code
   */
  verifyEmailCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, code } = req.body;
      
      const isValid = await this.mfaService.verifyEmailCode(userId, code);

      if (isValid) {
        res.json({
          success: true,
          message: 'Email verification successful',
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_EMAIL_CODE',
            message: 'Invalid or expired email code',
          },
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate recovery codes
   */
  generateRecoveryCodes = async (req: Request, res: Response, next: NextFunction) => {
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

      const codes = await this.mfaService.generateRecoveryCodes(userId as string);

      res.json({
        success: true,
        data: { codes: codes },
        message: 'Recovery codes generated',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify recovery code
   */
  verifyRecoveryCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, code } = req.body;
      
      const isValid = await this.mfaService.verifyRecoveryCode(userId, code);

      if (isValid) {
        res.json({
          success: true,
          message: 'Account recovery successful',
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_RECOVERY_CODE',
            message: 'Invalid or expired recovery code',
          },
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check MFA status
   */
  getMFAStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      
      const isEnabled = await this.mfaService.isMFAEnabled(userId as string);

      res.json({
        success: true,
        data: {
          userId,
          mfaEnabled: isEnabled,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
