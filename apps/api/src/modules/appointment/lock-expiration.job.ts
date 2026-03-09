import { prisma } from '../../lib/prisma';

export class LockExpirationJob {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  // Start the lock expiration job
  start(): void {
    if (this.isRunning) {
      console.log('Lock expiration job is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting lock expiration job...');

    // Run every 30 seconds to check for expired locks
    this.intervalId = setInterval(async () => {
      await this.processExpiredLocks();
    }, 30000);

    // Also run immediately on start
    this.processExpiredLocks();
  }

  // Stop the lock expiration job
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Lock expiration job stopped');
  }

  // Process expired locks
  private async processExpiredLocks(): Promise<void> {
    try {
      const expiredLocks = await this.findExpiredLocks();

      if (expiredLocks.length === 0) {
        return;
      }

      console.log(`Processing ${expiredLocks.length} expired locks...`);

      // Process each expired lock within a transaction
      await prisma.$transaction(async (tx) => {
        for (const lock of expiredLocks) {
          // Delete the expired lock
          await tx.slotLock.delete({
            where: { id: lock.id },
          });

          // If lock has an associated appointment, update its status
          if (lock.appointmentId) {
            await tx.appointment.update({
              where: { id: lock.appointmentId },
              data: {
                status: 'CANCELLED',
                updatedAt: new Date(),
                cancelledAt: new Date(),
              },
            });

            console.log(`Cancelled appointment ${lock.appointmentId} due to expired lock`);
          }

          // Record the lock expiration for metrics
          await this.recordLockExpiration(lock);
        }
      });

      console.log(`Successfully processed ${expiredLocks.length} expired locks`);

    } catch (error) {
      console.error('Error processing expired locks:', error);
    }
  }

  // Find expired locks
  private async findExpiredLocks(): Promise<any[]> {
    const now = new Date();

    const expiredLocks = await prisma.slotLock.findMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
      include: {
        appointment: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    return expiredLocks;
  }

  // Record lock expiration for analytics
  private async recordLockExpiration(lock: any): Promise<void> {
    try {
      // This would typically go to an analytics table
      // For now, we'll just log it
      console.log(`Lock expired: ${lock.id}, Type: ${lock.lockType}, Created: ${lock.createdAt}`);
    } catch (error) {
      console.error('Error recording lock expiration:', error);
    }
  }

  // Get job status
  getStatus(): { isRunning: boolean; uptime?: number } {
    return {
      isRunning: this.isRunning,
      // Could add uptime tracking if needed
    };
  }

  // Health check for the job
  async healthCheck(): Promise<{ status: string; lastRun?: Date; expiredLocksProcessed: number }> {
    try {
      const expiredLocks = await this.findExpiredLocks();
      
      return {
        status: this.isRunning ? 'healthy' : 'stopped',
        lastRun: new Date(), // Could track actual last run time
        expiredLocksProcessed: expiredLocks.length,
      };
    } catch (error) {
      return {
        status: 'error',
        expiredLocksProcessed: 0,
      };
    }
  }

  // Manual cleanup of very old locks (emergency function)
  async cleanupOldLocks(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

      const result = await prisma.slotLock.deleteMany({
        where: {
          expiresAt: {
            lt: cutoffTime,
          },
        },
      });

      console.log(`Cleaned up ${result.count} old locks (older than ${olderThanHours} hours)`);
      return result.count;

    } catch (error) {
      console.error('Error cleaning up old locks:', error);
      throw error;
    }
  }

  // Get lock statistics
  async getLockStats(): Promise<any> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        totalLocks,
        expiredLocks,
        recentLocks,
        activeLocks,
      ] = await Promise.all([
        prisma.slotLock.count(),
        prisma.slotLock.count({
          where: {
            expiresAt: { lt: now },
          },
        }),
        prisma.slotLock.count({
          where: {
            createdAt: { gte: oneHourAgo },
          },
        }),
        prisma.slotLock.count({
          where: {
            expiresAt: { gt: now },
            createdAt: { gte: oneDayAgo },
          },
        }),
      ]);

      return {
        totalLocks,
        expiredLocks,
        recentLocks,
        activeLocks,
        timestamp: now.toISOString(),
      };

    } catch (error) {
      console.error('Error getting lock stats:', error);
      throw error;
    }
  }
}
