import { prisma } from '../../lib/prisma';
import { logger } from '@bookease/logger';
import { AppointmentStatus } from '@prisma/client';
import { subMonths, startOfDay, endOfDay } from 'date-fns';

export interface ArchiveQuery {
    tenantId: string;
    search?: string;
    page?: number;
    limit?: number;
    includeArchived?: boolean;
}

export interface ArchiveResult {
    archivedCount: number;
    totalProcessed: number;
    errors: string[];
    duration: number;
}

export interface ArchivedAppointment {
    id: string;
    referenceId: string;
    customerName: string;
    serviceName: string;
    staffName: string;
    startTimeUtc: Date;
    endTimeUtc: Date;
    status: AppointmentStatus;
    notes?: string;
    archivedAt: Date;
    originalCreatedAt: Date;
}

export class ArchiveService {
    /**
     * Archive completed appointments older than X months
     * Non-blocking operation with progress tracking
     */
    async archiveCompletedAppointments(tenantId: string, monthsThreshold: number = 6): Promise<ArchiveResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        let archivedCount = 0;
        let totalProcessed = 0;

        logger.info({
            tenantId,
            monthsThreshold,
            operation: 'archive.completed.appointments'
        }, 'Starting archival process');

        try {
            // Calculate cutoff date
            const cutoffDate = startOfDay(subMonths(new Date(), monthsThreshold));
            
            logger.debug({
                tenantId,
                cutoffDate: cutoffDate.toISOString(),
                monthsThreshold
            }, 'Calculated archival cutoff date');

            // Find completed appointments older than threshold
            const appointmentsToArchive = await prisma.appointment.findMany({
                where: {
                    tenantId,
                    status: AppointmentStatus.COMPLETED,
                    endTimeUtc: {
                        lt: cutoffDate
                    }
                },
                include: {
                    customer: {
                        select: {
                            name: true,
                            email: true,
                            phone: true
                        }
                    },
                    service: {
                        select: {
                            name: true
                        }
                    },
                    staff: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: {
                    endTimeUtc: 'asc'
                }
            });

            totalProcessed = appointmentsToArchive.length;
            logger.info({
                tenantId,
                appointmentsToArchive: totalProcessed,
                cutoffDate: cutoffDate.toISOString()
            }, 'Found appointments to archive');

            // Process in batches to avoid blocking
            const batchSize = 100;
            for (let i = 0; i < appointmentsToArchive.length; i += batchSize) {
                const batch = appointmentsToArchive.slice(i, i + batchSize);
                
                for (const appointment of batch) {
                    try {
                        // Create archived record
                        await prisma.appointmentArchive.create({
                            data: {
                                tenantId,
                                serviceId: appointment.serviceId,
                                staffId: appointment.staffId,
                                customerId: appointment.customerId,
                                referenceId: appointment.referenceId,
                                startTimeUtc: appointment.startTimeUtc,
                                endTimeUtc: appointment.endTimeUtc,
                                status: appointment.status,
                                notes: appointment.notes,
                                createdBy: appointment.createdBy,
                                createdAt: appointment.createdAt,
                                updatedAt: appointment.updatedAt,
                                seriesId: appointment.seriesId,
                                seriesIndex: appointment.seriesIndex,
                                archivedAt: new Date()
                            }
                        });

                        // Delete original appointment (no isArchived flag in schema)
                        await prisma.appointment.delete({
                            where: { id: appointment.id }
                        });

                        archivedCount++;

                        // Log progress every 50 appointments
                        if (archivedCount % 50 === 0) {
                            logger.debug({
                                tenantId,
                                archivedCount,
                                totalProcessed,
                                progress: `${((archivedCount / totalProcessed) * 100).toFixed(1)}%`
                            }, 'Archival progress update');
                        }

                    } catch (error: any) {
                        const errorMsg = `Failed to archive appointment ${appointment.id}: ${error.message}`;
                        errors.push(errorMsg);
                        logger.error({
                            tenantId,
                            appointmentId: appointment.id,
                            error: error.message
                        }, 'Archive appointment failed');
                    }
                }

                // Small delay to prevent blocking
                if (i + batchSize < appointmentsToArchive.length) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }

            const duration = Date.now() - startTime;
            
            logger.info({
                tenantId,
                archivedCount,
                totalProcessed,
                errors: errors.length,
                duration,
                successRate: totalProcessed > 0 ? ((archivedCount / totalProcessed) * 100).toFixed(1) : '0'
            }, 'Archival process completed');

            return {
                archivedCount,
                totalProcessed,
                errors,
                duration
            };

        } catch (error: any) {
            const duration = Date.now() - startTime;
            const errorMsg = `Archival process failed: ${error.message}`;
            errors.push(errorMsg);
            
            logger.error({
                tenantId,
                error: error.message,
                duration,
                archivedCount,
                totalProcessed
            }, 'Archival process failed');

            return {
                archivedCount,
                totalProcessed,
                errors,
                duration
            };
        }
    }

    /**
     * Search archived appointments
     */
    async searchArchivedAppointments(query: ArchiveQuery): Promise<{
        appointments: ArchivedAppointment[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const startTime = Date.now();
        const { tenantId, search, page = 1, limit = 50 } = query;
        const skip = (page - 1) * limit;

        logger.debug({
            tenantId,
            search,
            page,
            limit
        }, 'Searching archived appointments');

        const where: any = { tenantId };

        if (search) {
            where.OR = [
                { referenceId: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [appointments, total] = await Promise.all([
            prisma.appointmentArchive.findMany({
                where,
                skip,
                take: limit,
                orderBy: { archivedAt: 'desc' },
                include: {
                    customer: {
                        select: {
                            name: true
                        }
                    },
                    service: {
                        select: {
                            name: true
                        }
                    },
                    staff: {
                        select: {
                            name: true
                        }
                    }
                }
            }),
            prisma.appointmentArchive.count({ where })
        ]);

        const formattedAppointments = appointments.map(appt => ({
            id: appt.id,
            referenceId: appt.referenceId,
            customerName: appt.customer?.name || 'Unknown',
            serviceName: appt.service?.name || 'Unknown',
            staffName: appt.staff?.name || 'Unknown',
            startTimeUtc: appt.startTimeUtc,
            endTimeUtc: appt.endTimeUtc,
            status: appt.status,
            notes: appt.notes,
            archivedAt: appt.archivedAt,
            originalCreatedAt: appt.createdAt
        }));

        const duration = Date.now() - startTime;
        
        logger.info({
            tenantId,
            resultCount: formattedAppointments.length,
            total,
            duration,
            search
        }, 'Archived appointments search completed');

        return {
            appointments: formattedAppointments,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    /**
     * Get archival statistics
     */
    async getArchiveStats(tenantId: string): Promise<{
        totalArchived: number;
        archivedByMonth: Array<{ month: string; count: number }>;
        archivedByService: Array<{ serviceName: string; count: number }>;
        oldestArchiveDate: Date | null;
        newestArchiveDate: Date | null;
    }> {
        const startTime = Date.now();

        logger.debug({ tenantId }, 'Generating archive statistics');

        const [
            totalArchived,
            archivedByMonth,
            archivedByService,
            oldestNewest
        ] = await Promise.all([
            // Total count
            prisma.appointmentArchive.count({ where: { tenantId } }),
            
            // By month
            prisma.appointmentArchive.groupBy({
                by: ['archivedAt'],
                where: { tenantId },
                _count: true,
                orderBy: { archivedAt: 'desc' }
            }).then((results: any[]) => {
                // Group by month
                const monthGroups: Record<string, number> = {};
                results.forEach(result => {
                    const month = result.archivedAt.toISOString().slice(0, 7); // YYYY-MM
                    monthGroups[month] = (monthGroups[month] || 0) + result._count;
                });
                return Object.entries(monthGroups).map(([month, count]) => ({ month, count }));
            }),
            
            // By service
            prisma.appointmentArchive.groupBy({
                by: ['serviceId'],
                where: { tenantId },
                _count: true,
                orderBy: { _count: { count: 'desc' } },
                take: 10
            }).then(async (results: any[]) => {
                // Get service names
                const serviceIds = results.map(r => r.serviceId);
                const services = await prisma.service.findMany({
                    where: { id: { in: serviceIds } },
                    select: { id: true, name: true }
                });
                
                return results.map((result: any) => {
                    const service = services.find(s => s.id === result.serviceId);
                    return { 
                        serviceName: service?.name || 'Unknown', 
                        count: result._count 
                    };
                });
            }),
            
            // Oldest and newest
            prisma.appointmentArchive.findMany({
                where: { tenantId },
                select: { archivedAt: true },
                orderBy: { archivedAt: 'asc' },
                take: 1
            }).then((oldest: any[]) => oldest[0]?.archivedAt || null)
            .then(async (oldest: any) => {
                const newest = await prisma.appointmentArchive.findFirst({
                    where: { tenantId },
                    select: { archivedAt: true },
                    orderBy: { archivedAt: 'desc' }
                });
                return { oldest, newest: newest?.archivedAt || null };
            })
        ]);

        const { oldest, newest } = oldestNewest;
        const duration = Date.now() - startTime;

        logger.info({
            tenantId,
            totalArchived,
            duration
        }, 'Archive statistics generated');

        return {
            totalArchived,
            archivedByMonth,
            archivedByService,
            oldestArchiveDate: oldest,
            newestArchiveDate: newest
        };
    }

    /**
     * Restore archived appointment (admin only)
     */
    async restoreArchivedAppointment(tenantId: string, archivedId: string): Promise<{
        success: boolean;
        message: string;
        appointmentId?: string;
    }> {
        const startTime = Date.now();

        try {
            logger.info({
                tenantId,
                archivedId
            }, 'Starting archived appointment restoration');

            // Get archived appointment
            const archived = await prisma.appointmentArchive.findFirst({
                where: {
                    id: archivedId,
                    tenantId
                }
            });

            if (!archived) {
                return {
                    success: false,
                    message: 'Archived appointment not found'
                };
            }

            // Check if appointment with same ID already exists
            const existing = await prisma.appointment.findUnique({
                where: { id: archivedId }
            });

            if (existing) {
                return {
                    success: false,
                    message: 'Appointment with same ID already exists - cannot restore'
                };
            }

            // Restore appointment
            const restoredAppointment = await prisma.appointment.create({
                data: {
                    id: archivedId,
                    tenantId,
                    serviceId: archived.serviceId,
                    staffId: archived.staffId,
                    customerId: archived.customerId,
                    referenceId: archived.referenceId,
                    startTimeUtc: archived.startTimeUtc,
                    endTimeUtc: archived.endTimeUtc,
                    status: archived.status,
                    notes: archived.notes,
                    createdBy: archived.createdBy,
                    createdAt: archived.createdAt,
                    updatedAt: new Date(),
                    seriesId: archived.seriesId,
                    seriesIndex: archived.seriesIndex
                }
            });

            // Delete archived record
            await prisma.appointmentArchive.delete({
                where: { id: archivedId }
            });

            const duration = Date.now() - startTime;
            
            logger.info({
                tenantId,
                archivedId,
                restoredAppointmentId: restoredAppointment.id,
                duration
            }, 'Archived appointment restored successfully');

            return {
                success: true,
                message: 'Appointment restored successfully',
                appointmentId: restoredAppointment.id
            };

        } catch (error: any) {
            const duration = Date.now() - startTime;
            
            logger.error({
                tenantId,
                archivedId,
                error: error.message,
                duration
            }, 'Failed to restore archived appointment');

            return {
                success: false,
                message: `Failed to restore appointment: ${error.message}`
            };
        }
    }

    /**
     * Test archival performance (admin only)
     */
    async testArchivalPerformance(tenantId: string, testMonths: number = 1): Promise<{
        testResults: {
            archiveTime: string;
            searchTime: string;
            statsTime: string;
            totalTime: string;
        };
        meetsRequirements: {
            nonBlocking: boolean;
            noDataLoss: boolean;
            searchPerformance: boolean;
        };
    }> {
        const startTime = Date.now();
        
        logger.info({
            tenantId,
            testMonths
        }, 'Starting archival performance test');

        // Create test data (customers, services, staff first)
        const testCustomer = await prisma.customer.create({
            data: {
                tenantId,
                name: 'Test Archive Customer',
                email: `archive-test-${Date.now()}@example.com`,
                phone: '1234567890'
            }
        });

        const testService = await prisma.service.create({
            data: {
                tenantId,
                name: 'Test Archive Service',
                durationMinutes: 30,
                bufferBefore: 5,
                bufferAfter: 5
            }
        });

        const testStaff = await prisma.staff.create({
            data: {
                tenantId,
                name: 'Test Archive Staff',
                email: `archive-staff-${Date.now()}@example.com`
            }
        });

        // Create test appointments
        const testAppointments = [];
        const oldDate = subMonths(new Date(), testMonths + 1);
        
        for (let i = 0; i < 10; i++) {
            const appointment = await prisma.appointment.create({
                data: {
                    tenantId,
                    referenceId: `TEST-ARCHIVE-${i}`,
                    startTimeUtc: new Date(oldDate.getTime() + i * 60 * 60 * 1000),
                    endTimeUtc: new Date(oldDate.getTime() + (i + 1) * 60 * 60 * 1000),
                    status: AppointmentStatus.COMPLETED,
                    customerId: testCustomer.id,
                    serviceId: testService.id,
                    staffId: testStaff.id
                }
            });
            testAppointments.push(appointment);
        }

        // Test archival performance
        const archiveStart = Date.now();
        const archiveResult = await this.archiveCompletedAppointments(tenantId, testMonths);
        const archiveTime = Date.now() - archiveStart;

        // Test search performance
        const searchStart = Date.now();
        await this.searchArchivedAppointments({
            tenantId,
            search: 'TEST-ARCHIVE',
            page: 1,
            limit: 10
        });
        const searchTime = Date.now() - searchStart;

        // Test stats performance
        const statsStart = Date.now();
        await this.getArchiveStats(tenantId);
        const statsTime = Date.now() - statsStart;

        const totalTime = Date.now() - startTime;

        // Clean up test data
        await prisma.appointmentArchive.deleteMany({
            where: {
                referenceId: { startsWith: 'TEST-ARCHIVE' },
                tenantId
            }
        });

        // Clean up test entities
        await prisma.customer.delete({ where: { id: testCustomer.id } });
        await prisma.service.delete({ where: { id: testService.id } });
        await prisma.staff.delete({ where: { id: testStaff.id } });

        const testResults = {
            archiveTime: `${archiveTime}ms`,
            searchTime: `${searchTime}ms`,
            statsTime: `${statsTime}ms`,
            totalTime: `${totalTime}ms`
        };

        const meetsRequirements = {
            nonBlocking: archiveTime < 5000, // Should complete in under 5 seconds for small batch
            noDataLoss: archiveResult.errors.length === 0,
            searchPerformance: searchTime < 500 // Search should be fast
        };

        logger.info({
            tenantId,
            testResults,
            meetsRequirements
        }, 'Archival performance test completed');

        return { testResults, meetsRequirements };
    }
}

export const archiveService = new ArchiveService();
