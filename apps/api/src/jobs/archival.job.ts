import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { logger } from '@bookease/logger';
import { subMonths } from 'date-fns';

export class ArchivalJob {
    private isRunning = false;

    // Default configuration: Archive anything older than 12 months that is in a terminal state
    private defaultArchivalMonths = 12;
    private batchSize = 500;

    public init() {
        // Run on the 1st of every month at 00:00
        cron.schedule('0 0 1 * *', () => {
            this.runArchivalProcess().catch(err => {
                logger.error('Archival job failed:', err);
            });
        });
        logger.info('Archival cron job initialized to run monthly.');
    }

    public async runArchivalProcess() {
        if (this.isRunning) {
            logger.warn('Archival job is already running, skipping this trigger.');
            return;
        }

        this.isRunning = true;
        logger.info('Starting Archival Process...');

        try {
            const cutoffDate = subMonths(new Date(), this.defaultArchivalMonths);

            let hasMore = true;
            let totalArchived = 0;

            while (hasMore) {
                // Find candidates
                // We exclude active statuses like BOOKED or CONFIRMED regardless of age to be safe
                const candidates = await prisma.appointment.findMany({
                    where: {
                        status: {
                            in: ['COMPLETED', 'CANCELLED', 'NO_SHOW']
                        },
                        createdAt: {
                            lt: cutoffDate
                        }
                    },
                    take: this.batchSize,
                    select: {
                        id: true,
                        tenantId: true,
                        serviceId: true,
                        staffId: true,
                        customerId: true,
                        referenceId: true,
                        startTimeUtc: true,
                        endTimeUtc: true,
                        status: true,
                        notes: true,
                        createdBy: true,
                        createdAt: true,
                        updatedAt: true,
                        seriesId: true,
                        seriesIndex: true
                    }
                });

                if (candidates.length === 0) {
                    hasMore = false;
                    break;
                }

                const idsToArchive = candidates.map(c => c.id);

                // Perform the migration in a transaction
                await prisma.$transaction([
                    // 1. Delete associated timeline events (cascading manually since DB relies on Prisma for now)
                    prisma.appointmentTimeline.deleteMany({
                        where: { appointmentId: { in: idsToArchive } }
                    }),

                    // 2. Insert into Archive
                    prisma.appointmentArchive.createMany({
                        data: candidates.map(c => ({
                            id: c.id,
                            tenantId: c.tenantId,
                            serviceId: c.serviceId,
                            staffId: c.staffId,
                            customerId: c.customerId,
                            referenceId: c.referenceId,
                            startTimeUtc: c.startTimeUtc,
                            endTimeUtc: c.endTimeUtc,
                            status: c.status as any,
                            notes: c.notes,
                            createdBy: c.createdBy,
                            createdAt: c.createdAt,
                            updatedAt: c.updatedAt,
                            seriesId: c.seriesId,
                            seriesIndex: c.seriesIndex,
                            archivedAt: new Date()
                        }))
                    }),

                    // 3. Delete from original table
                    prisma.appointment.deleteMany({
                        where: { id: { in: idsToArchive } }
                    })
                ]);

                totalArchived += candidates.length;
                logger.info(`Archived batch of ${candidates.length} appointments. Total so far: ${totalArchived}`);
            }

            logger.info(`Archival Process completed successfully. Total archived: ${totalArchived}`);
        } catch (error) {
            logger.error({ err: error }, 'Error during Archival Process');
            throw error;
        } finally {
            this.isRunning = false;
        }
    }
}

export const archivalJob = new ArchivalJob();
