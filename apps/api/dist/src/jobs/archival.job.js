"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.archivalJob = exports.ArchivalJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("../lib/prisma");
const logger_1 = require("@bookease/logger");
const date_fns_1 = require("date-fns");
class ArchivalJob {
    isRunning = false;
    // Default configuration: Archive anything older than 12 months that is in a terminal state
    defaultArchivalMonths = 12;
    batchSize = 500;
    init() {
        // Run on the 1st of every month at 00:00
        node_cron_1.default.schedule('0 0 1 * *', () => {
            this.runArchivalProcess().catch(err => {
                logger_1.logger.error('Archival job failed:', err);
            });
        });
        logger_1.logger.info('Archival cron job initialized to run monthly.');
    }
    async runArchivalProcess() {
        if (this.isRunning) {
            logger_1.logger.warn('Archival job is already running, skipping this trigger.');
            return;
        }
        this.isRunning = true;
        logger_1.logger.info('Starting Archival Process...');
        try {
            const cutoffDate = (0, date_fns_1.subMonths)(new Date(), this.defaultArchivalMonths);
            let hasMore = true;
            let totalArchived = 0;
            while (hasMore) {
                // Find candidates
                // We exclude active statuses like BOOKED or CONFIRMED regardless of age to be safe
                const candidates = await prisma_1.prisma.appointment.findMany({
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
                await prisma_1.prisma.$transaction([
                    // 1. Delete associated timeline events (cascading manually since DB relies on Prisma for now)
                    prisma_1.prisma.appointmentTimeline.deleteMany({
                        where: { appointmentId: { in: idsToArchive } }
                    }),
                    // 2. Insert into Archive
                    prisma_1.prisma.appointmentArchive.createMany({
                        data: candidates.map(c => ({
                            id: c.id,
                            tenantId: c.tenantId,
                            serviceId: c.serviceId,
                            staffId: c.staffId,
                            customerId: c.customerId,
                            referenceId: c.referenceId,
                            startTimeUtc: c.startTimeUtc,
                            endTimeUtc: c.endTimeUtc,
                            status: c.status,
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
                    prisma_1.prisma.appointment.deleteMany({
                        where: { id: { in: idsToArchive } }
                    })
                ]);
                totalArchived += candidates.length;
                logger_1.logger.info(`Archived batch of ${candidates.length} appointments. Total so far: ${totalArchived}`);
            }
            logger_1.logger.info(`Archival Process completed successfully. Total archived: ${totalArchived}`);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'Error during Archival Process');
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
}
exports.ArchivalJob = ArchivalJob;
exports.archivalJob = new ArchivalJob();
