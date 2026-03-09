"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionController = void 0;
class SessionController {
    sessionService;
    constructor(sessionService) {
        this.sessionService = sessionService;
    }
    /**
     * Create a new session
     */
    createSession = async (req, res, next) => {
        try {
            const data = req.body;
            const sessionResponse = await this.sessionService.createSession(data);
            res.json({
                success: true,
                data: sessionResponse,
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Get session by token
     */
    getSession = async (req, res, next) => {
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
            const session = await this.sessionService.findByToken(token);
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
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Get user sessions
     */
    getUserSessions = async (req, res, next) => {
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
            const sessions = await this.sessionService.findByUser(userId, limit ? parseInt(limit) : undefined);
            res.json({
                success: true,
                data: { sessions: sessions },
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Update session last access
     */
    updateSession = async (req, res, next) => {
        try {
            const { token } = req.params;
            await this.sessionService.updateLastAccess(token);
            res.json({
                success: true,
                message: 'Session updated successfully',
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Delete session
     */
    deleteSession = async (req, res, next) => {
        try {
            const { token } = req.params;
            await this.sessionService.deleteSession(token);
            res.json({
                success: true,
                message: 'Session deleted successfully',
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Delete all user sessions
     */
    deleteUserSessions = async (req, res, next) => {
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
            await this.sessionService.deleteUserSessions(userId);
            res.json({
                success: true,
                message: 'All user sessions deleted successfully',
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Get session analytics
     */
    getSessionAnalytics = async (req, res, next) => {
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
            const analytics = await this.sessionService.getSessionAnalytics(userId);
            res.json({
                success: true,
                data: analytics,
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Clean expired sessions
     */
    cleanExpiredSessions = async (req, res, next) => {
        try {
            await this.sessionService.deleteExpiredSessions();
            res.json({
                success: true,
                message: 'Expired sessions cleaned successfully',
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.SessionController = SessionController;
