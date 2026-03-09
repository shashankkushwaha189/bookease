import { PrismaClient, Session } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface CreateSessionData {
  userId: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionResponse {
  session: Session;
  token: string;
  expiresAt: Date;
}

export class SessionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new session
   */
  async createSession(data: CreateSessionData): Promise<SessionResponse> {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const session = await this.prisma.session.create({
      data: {
        userId: data.userId,
        token,
        expiresAt,
        createdAt: new Date(),
        lastAccessAt: new Date(),
        deviceId: data.deviceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    return {
      session,
      token,
      expiresAt,
    };
  }

  /**
   * Find session by token
   */
  async findByToken(token: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            tenantId: true,
          },
        },
      },
    });
  }

  /**
   * Find sessions by user
   */
  async findByUser(userId: string, limit = 10): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { lastAccessAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            tenantId: true,
          },
        },
      },
    });
  }

  /**
   * Update session last access
   */
  async updateLastAccess(token: string): Promise<void> {
    await this.prisma.session.update({
      where: { token },
      data: { lastAccessAt: new Date() },
    });
  }

  /**
   * Delete session
   */
  async deleteSession(token: string): Promise<void> {
    await this.prisma.session.delete({
      where: { token },
    });
  }

  /**
   * Delete expired sessions
   */
  async deleteExpiredSessions(): Promise<void> {
    await this.prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * Delete all user sessions
   */
  async deleteUserSessions(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * Generate secure session token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate session token
   */
  async validateSession(token: string): Promise<boolean> {
    const session = await this.findByToken(token);
    
    if (!session) {
      return false;
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Get active sessions count for user
   */
  async getActiveSessionsCount(userId: string): Promise<number> {
    return this.prisma.session.count({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  /**
   * Get session analytics
   */
  async getSessionAnalytics(userId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    devices: Array<{ deviceId: string; count: number; lastAccess: Date }>;
  }> {
    const sessions = await this.findByUser(userId, 100);
    
    const activeSessions = sessions.filter(s => 
      new Date() <= s.expiresAt
    );

    const deviceMap = new Map<string, { count: number; lastAccess: Date }>();
    
    sessions.forEach(session => {
      if (session.deviceId) {
        const existing = deviceMap.get(session.deviceId);
        if (existing) {
          existing.count++;
          if (new Date(session.lastAccessAt) > new Date(existing.lastAccess)) {
            existing.lastAccess = session.lastAccess;
          }
        } else {
          deviceMap.set(session.deviceId, {
            count: 1,
            lastAccess: session.lastAccess,
          });
        }
      }
    });

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      devices: Array.from(deviceMap.values()),
    };
  }
}
