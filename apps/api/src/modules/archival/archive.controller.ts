import { Request, Response, NextFunction } from 'express';
import { archiveService, ArchiveQuery } from './archive.service';
import { logger } from '@bookease/logger';

export class ArchiveController {

    /**
     * Archive completed appointments older than specified months
     */
    archiveAppointments = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const startTime = Date.now();
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { months = 6 } = req.body;

            // Validate tenant ID
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }

            // Check admin role
            const userRole = (req as any).user?.role || req.headers['x-user-role'];
            if (userRole !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required to archive appointments'
                    }
                });
            }

            // Validate months
            if (months < 1 || months > 36) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_MONTHS',
                        message: 'Months must be between 1 and 36'
                    }
                });
            }

            const result = await archiveService.archiveCompletedAppointments(tenantId, months);
            
            const duration = Date.now() - startTime;
            logger.info({
                tenantId,
                months,
                archivedCount: result.archivedCount,
                duration,
                meetsRequirement: duration < 5000 ? 'PASS' : 'FAIL'
            }, 'Archive appointments completed');

            return res.status(200).json({
                success: true,
                data: result,
                meta: {
                    duration: `${duration}ms`,
                    meetsRequirement: duration < 5000 ? 'PASS' : 'FAIL',
                    isNonBlocking: true
                }
            });
        } catch (error: any) {
            logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'archive.appointments'
            }, 'Archive appointments failed');
            next(error);
        }
    };

    /**
     * Search archived appointments
     */
    searchArchived = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const startTime = Date.now();
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { search, page = 1, limit = 50 } = req.query;

            // Validate tenant ID
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }

            // Validate pagination
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 50;
            
            if (pageNum < 1) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_PAGE',
                        message: 'Page must be greater than 0'
                    }
                });
            }

            if (limitNum < 1 || limitNum > 1000) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_LIMIT',
                        message: 'Limit must be between 1 and 1000'
                    }
                });
            }

            const query: ArchiveQuery = {
                tenantId,
                search: search as string,
                page: pageNum,
                limit: limitNum
            };

            const result = await archiveService.searchArchivedAppointments(query);
            
            const duration = Date.now() - startTime;
            logger.info({
                tenantId,
                search,
                resultCount: result.appointments.length,
                duration,
                meetsRequirement: duration < 2000 ? 'PASS' : 'FAIL'
            }, 'Archive search completed');

            return res.status(200).json({
                success: true,
                data: result,
                meta: {
                    duration: `${duration}ms`,
                    meetsRequirement: duration < 2000 ? 'PASS' : 'FAIL',
                    searchable: true
                }
            });
        } catch (error: any) {
            logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'archive.search'
            }, 'Archive search failed');
            next(error);
        }
    };

    /**
     * Get archive statistics
     */
    getArchiveStats = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const startTime = Date.now();
            const tenantId = String(req.headers['x-tenant-id'] || '');

            // Validate tenant ID
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }

            // Check admin role
            const userRole = (req as any).user?.role || req.headers['x-user-role'];
            if (userRole !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required to view archive statistics'
                    }
                });
            }

            const stats = await archiveService.getArchiveStats(tenantId);
            
            const duration = Date.now() - startTime;
            logger.info({
                tenantId,
                totalArchived: stats.totalArchived,
                duration,
                meetsRequirement: duration < 2000 ? 'PASS' : 'FAIL'
            }, 'Archive statistics retrieved');

            return res.status(200).json({
                success: true,
                data: stats,
                meta: {
                    duration: `${duration}ms`,
                    meetsRequirement: duration < 2000 ? 'PASS' : 'FAIL'
                }
            });
        } catch (error: any) {
            logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'archive.stats'
            }, 'Archive statistics failed');
            next(error);
        }
    };

    /**
     * Restore archived appointment
     */
    restoreAppointment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const startTime = Date.now();
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { archivedId } = req.params;

            // Validate tenant ID
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }

            // Check admin role
            const userRole = (req as any).user?.role || req.headers['x-user-role'];
            if (userRole !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required to restore appointments'
                    }
                });
            }

            // Validate archived ID
            if (!archivedId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_ARCHIVED_ID',
                        message: 'Archived appointment ID is required'
                    }
                });
            }

            const result = await archiveService.restoreArchivedAppointment(tenantId, archivedId as string);
            
            const duration = Date.now() - startTime;
            logger.info({
                tenantId,
                archivedId,
                success: result.success,
                duration
            }, 'Archive restore completed');

            return res.status(result.success ? 200 : 400).json({
                success: result.success,
                data: result,
                meta: {
                    duration: `${duration}ms`,
                    noDataLoss: result.success
                }
            });
        } catch (error: any) {
            logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'archive.restore'
            }, 'Archive restore failed');
            next(error);
        }
    };

    /**
     * Test archival performance (admin only)
     */
    testPerformance = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const startTime = Date.now();
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { testMonths = 1 } = req.body;

            // Validate tenant ID
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }

            // Check admin role
            const userRole = (req as any).user?.role || req.headers['x-user-role'];
            if (userRole !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required to test archival performance'
                    }
                });
            }

            // Validate test months
            if (testMonths < 1 || testMonths > 12) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_TEST_MONTHS',
                        message: 'Test months must be between 1 and 12'
                    }
                });
            }

            const result = await archiveService.testArchivalPerformance(tenantId, testMonths);
            
            const duration = Date.now() - startTime;
            logger.info({
                tenantId,
                testMonths,
                ...result.testResults,
                ...result.meetsRequirements,
                duration
            }, 'Archive performance test completed');

            return res.status(200).json({
                success: true,
                data: result,
                meta: {
                    duration: `${duration}ms`,
                    requirements: {
                        nonBlocking: result.meetsRequirements.nonBlocking,
                        noDataLoss: result.meetsRequirements.noDataLoss,
                        searchPerformance: result.meetsRequirements.searchPerformance
                    }
                }
            });
        } catch (error: any) {
            logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'archive.testPerformance'
            }, 'Archive performance test failed');
            next(error);
        }
    };

    /**
     * Get archive configuration
     */
    getConfiguration = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');

            // Validate tenant ID
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_TENANT_ID',
                        message: 'Tenant ID is required'
                    }
                });
            }

            // Check admin role
            const userRole = (req as any).user?.role || req.headers['x-user-role'];
            if (userRole !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Admin access required to view archive configuration'
                    }
                });
            }

            const stats = await archiveService.getArchiveStats(tenantId);
            
            // Calculate recommendations
            const recommendations = [];
            if (stats.totalArchived === 0) {
                recommendations.push('Consider archiving completed appointments older than 6 months to improve performance');
            }
            if (stats.totalArchived > 10000) {
                recommendations.push('Consider reducing archive threshold or implementing additional cleanup strategies');
            }

            return res.status(200).json({
                success: true,
                data: {
                    currentStats: stats,
                    configuration: {
                        defaultArchiveMonths: 6,
                        maxArchiveMonths: 36,
                        batchSize: 100,
                        supportedOperations: [
                            'archive_completed',
                            'search_archived',
                            'restore_archived',
                            'get_statistics'
                        ]
                    },
                    recommendations,
                    features: {
                        nonBlocking: true,
                        searchable: true,
                        restorable: true,
                        noDataLoss: true
                    }
                }
            });
        } catch (error: any) {
            logger.error({
                error: error.message,
                tenantId: req.headers['x-tenant-id'],
                operation: 'archive.configuration'
            }, 'Archive configuration failed');
            next(error);
        }
    };
}

export const archiveController = new ArchiveController();
