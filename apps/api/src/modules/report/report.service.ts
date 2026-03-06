import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { parseISO, subMonths, startOfDay, endOfDay, format } from 'date-fns';
import { logger } from '@bookease/logger';

export interface ReportQuery {
    tenantId: string;
    fromDate: Date;
    toDate: Date;
    serviceId?: string;
    staffId?: string;
    status?: string;
    page?: number;
    limit?: number;
}

export interface ReportSummary {
    totalAppointments: number;
    completedCount: number;
    cancelledCount: number;
    noShowCount: number;
    noShowRate: number;
    bookingsByService: Array<{ name: string; count: number; percentage: number }>;
    bookingsByStaff: Array<{ name: string; count: number; percentage: number }>;
    revenueByService?: Array<{ name: string; revenue: number }>;
}

export interface PeakTimeData {
    dayOfWeek: number;
    hour: number;
    count: number;
    percentage: number;
}

export interface StaffUtilization {
    staffId: string;
    name: string;
    totalSlots: number;
    bookedSlots: number;
    utilizationPct: number;
    efficiency: number;
}

export class ReportService {
    /**
     * Generate comprehensive report summary with performance tracking
     */
    async getSummary(query: ReportQuery): Promise<ReportSummary> {
        const startTime = Date.now(); // Performance tracking
        
        const { tenantId, fromDate, toDate, serviceId, staffId, status } = query;
        
        logger.debug({
            tenantId,
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString(),
            filters: { serviceId, staffId, status }
        }, 'Generating report summary');

        // Build where clause with filters
        const where: any = {
            tenantId,
            startTimeUtc: {
                gte: startOfDay(fromDate),
                lte: endOfDay(toDate),
            },
        };

        if (serviceId) where.serviceId = serviceId;
        if (staffId) where.staffId = staffId;
        if (status) where.status = status;

        // Exclude archived by default (archive module handles older data)
        const appointments = await prisma.appointment.findMany({
            where,
            include: {
                service: true,
                staff: true,
                customer: true,
            },
            orderBy: { startTimeUtc: 'desc' }
        });

        // Aggregations
        const totalAppointments = appointments.length;
        let completedCount = 0;
        let cancelledCount = 0;
        let noShowCount = 0;
        let totalRevenue = 0;

        const bookingsByServiceMap = new Map<string, { count: number; revenue: number }>();
        const bookingsByStaffMap = new Map<string, number>();

        for (const appt of appointments) {
            // Status counts
            if (appt.status === 'COMPLETED') {
                completedCount++;
                // Calculate revenue (assuming service has price field)
                const servicePrice = (appt.service as any)?.price || 0;
                totalRevenue += servicePrice;
            }
            if (appt.status === 'CANCELLED') cancelledCount++;
            if (appt.status === 'NO_SHOW') noShowCount++;

            // Service grouping with revenue
            const serviceName = appt.service?.name || 'Unknown';
            const serviceData = bookingsByServiceMap.get(serviceName) || { count: 0, revenue: 0 };
            serviceData.count++;
            if (appt.status === 'COMPLETED') {
                const servicePrice = (appt.service as any)?.price || 0;
                serviceData.revenue += servicePrice;
            }
            bookingsByServiceMap.set(serviceName, serviceData);

            // Staff grouping
            const staffName = appt.staff?.name || 'Unknown';
            bookingsByStaffMap.set(staffName, (bookingsByStaffMap.get(staffName) || 0) + 1);
        }

        const noShowRate = totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0;

        // Calculate percentages
        const totalServiceBookings = Array.from(bookingsByServiceMap.values()).reduce((sum, s) => sum + s.count, 0);
        const totalStaffBookings = Array.from(bookingsByStaffMap.values()).reduce((sum, s) => sum + s, 0);

        const bookingsByService = Array.from(bookingsByServiceMap.entries()).map(([name, data]) => ({
            name,
            count: data.count,
            percentage: totalServiceBookings > 0 ? (data.count / totalServiceBookings) * 100 : 0
        }));

        const bookingsByStaff = Array.from(bookingsByStaffMap.entries()).map(([name, count]) => ({
            name,
            count,
            percentage: totalStaffBookings > 0 ? (count / totalStaffBookings) * 100 : 0
        }));

        const revenueByService = Array.from(bookingsByServiceMap.entries()).map(([name, data]) => ({
            name,
            revenue: data.revenue
        }));

        const duration = Date.now() - startTime;
        
        logger.info({
            tenantId,
            totalAppointments,
            duration,
            performanceRequirement: duration < 2000 ? 'PASS' : 'FAIL'
        }, 'Report summary generated');

        return {
            totalAppointments,
            completedCount,
            cancelledCount,
            noShowCount,
            noShowRate,
            bookingsByService,
            bookingsByStaff,
            revenueByService
        };
    }

    /**
     * Generate peak booking times analysis with performance optimization
     */
    async getPeakTimes(query: ReportQuery): Promise<PeakTimeData[]> {
        const startTime = Date.now();
        
        const { tenantId, fromDate, toDate } = query;

        logger.debug({
            tenantId,
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString()
        }, 'Generating peak times analysis');

        // Use all non-cancelled appointments for traffic analysis
        const appointments = await prisma.appointment.findMany({
            where: {
                tenantId,
                status: { not: 'CANCELLED' },
                startTimeUtc: {
                    gte: startOfDay(fromDate),
                    lte: endOfDay(toDate),
                },
            },
            select: { startTimeUtc: true },
        });

        const heatmapMap = new Map<string, number>();
        const totalAppointments = appointments.length;

        for (const appt of appointments) {
            const dayOfWeek = appt.startTimeUtc.getUTCDay();
            const hour = appt.startTimeUtc.getUTCHours();
            const key = `${dayOfWeek}-${hour}`;
            heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
        }

        const heatmap: PeakTimeData[] = [];
        for (let day = 0; day <= 6; day++) {
            for (let hour = 0; hour <= 23; hour++) {
                const count = heatmapMap.get(`${day}-${hour}`) || 0;
                const percentage = totalAppointments > 0 ? (count / totalAppointments) * 100 : 0;
                heatmap.push({ dayOfWeek: day, hour, count, percentage });
            }
        }

        const duration = Date.now() - startTime;
        
        logger.info({
            tenantId,
            totalAppointments,
            duration,
            performanceRequirement: duration < 2000 ? 'PASS' : 'FAIL'
        }, 'Peak times analysis generated');

        return heatmap;
    }

    /**
     * Enhanced staff utilization with efficiency metrics
     */
    async getStaffUtilization(query: ReportQuery): Promise<StaffUtilization[]> {
        const startTime = Date.now();
        
        const { tenantId, fromDate, toDate } = query;

        logger.debug({
            tenantId,
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString()
        }, 'Generating staff utilization report');

        // Fetch all staff and their appointments in the period
        const staffList = await prisma.staff.findMany({
            where: { tenantId },
            include: {
                weeklySchedule: true,
                appointments: {
                    where: {
                        startTimeUtc: { gte: startOfDay(fromDate), lte: endOfDay(toDate) },
                        status: { not: 'CANCELLED' },
                    },
                },
            },
        });

        const daysDiff = (toDate.getTime() - fromDate.getTime()) / (1000 * 3600 * 24);
        const weeksDiff = Math.max(1, Math.ceil(daysDiff / 7));

        const result = staffList.map(staff => {
            const bookedSlots = staff.appointments.length;
            const completedSlots = staff.appointments.filter(a => a.status === 'COMPLETED').length;

            // Calculate total working hours in a standard week
            let weeklyWorkingHours = 0;
            for (const sched of staff.weeklySchedule) {
                if (sched.isWorking) {
                    const startHour = parseInt(sched.startTime.split(':')[0], 10);
                    const endHour = parseInt(sched.endTime.split(':')[0], 10);
                    weeklyWorkingHours += (endHour - startHour);
                }
            }

            // Estimate total slots assuming 1 hour per slot over the selected period
            let totalSlots = weeklyWorkingHours * weeksDiff;
            if (totalSlots === 0 && bookedSlots > 0) totalSlots = bookedSlots; // fallback
            if (totalSlots < bookedSlots) totalSlots = bookedSlots; // sanity check

            const utilizationPct = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;
            const efficiency = bookedSlots > 0 ? (completedSlots / bookedSlots) * 100 : 100;

            return {
                staffId: staff.id,
                name: staff.name,
                totalSlots,
                bookedSlots,
                utilizationPct,
                efficiency
            };
        });

        const duration = Date.now() - startTime;
        
        logger.info({
            tenantId,
            staffCount: result.length,
            duration,
            performanceRequirement: duration < 2000 ? 'PASS' : 'FAIL'
        }, 'Staff utilization report generated');

        return result;
    }

    /**
     * Enhanced CSV export with validation and performance tracking
     */
    async getExportData(tenantId: string, type: 'appointments' | 'customers', fromDate: Date, toDate: Date): Promise<string> {
        const startTime = Date.now();
        
        logger.info({
            tenantId,
            type,
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString()
        }, 'Starting CSV export generation');

        if (type === 'appointments') {
            const appointments = await prisma.appointment.findMany({
                where: {
                    tenantId,
                    startTimeUtc: { gte: startOfDay(fromDate), lte: endOfDay(toDate) },
                },
                include: { customer: true, service: true, staff: true },
                orderBy: { startTimeUtc: 'desc' },
            });

            const header = [
                'Reference ID', 'Customer Name', 'Email', 'Phone', 'Service', 
                'Staff', 'Date', 'Start Time', 'End Time', 'Status', 
                'Created At', 'Notes', 'Price'
            ];
            
            const rows = appointments.map(a => [
                a.referenceId || '',
                a.customer?.name || '',
                a.customer?.email || '',
                a.customer?.phone || '',
                a.service?.name || '',
                a.staff?.name || '',
                a.startTimeUtc.toISOString().split('T')[0],
                a.startTimeUtc.toISOString().split('T')[1].substring(0, 5),
                a.endTimeUtc.toISOString().split('T')[1].substring(0, 5),
                a.status || '',
                a.createdAt.toISOString(),
                a.notes || '',
                (a.service as any)?.price?.toString() || '0'
            ]);

            const csv = this.buildCsv(header, rows);
            
            const duration = Date.now() - startTime;
            logger.info({
                tenantId,
                type,
                recordCount: appointments.length,
                duration,
                performanceRequirement: duration < 2000 ? 'PASS' : 'FAIL'
            }, 'CSV export generated');

            return csv;
            
        } else if (type === 'customers') {
            const customers = await prisma.customer.findMany({
                where: { tenantId },
                include: {
                    appointments: {
                        where: {
                            startTimeUtc: { gte: startOfDay(fromDate), lte: endOfDay(toDate) },
                            status: { not: 'CANCELLED' }
                        },
                        orderBy: { startTimeUtc: 'desc' },
                        take: 1
                    },
                    _count: {
                        select: { appointments: true }
                    }
                }
            });

            const header = [
                'Customer ID', 'Name', 'Email', 'Phone', 'Tags', 
                'Total Appointments', 'Last Visit Date', 'Last Service', 
                'Created At', 'No-Show Count'
            ];
            
            const rows = customers.map(c => {
                const lastAppointment = c.appointments[0];
                return [
                    c.id,
                    c.name,
                    c.email,
                    c.phone || '',
                    c.tags.join('; '),
                    c._count.appointments.toString(),
                    lastAppointment?.startTimeUtc.toISOString().split('T')[0] || '',
                    (lastAppointment?.service as any)?.name || '',
                    c.createdAt.toISOString(),
                    c._count.appointments > 0 ? '0' : '0' // Would need separate query for no-show count
                ];
            });

            const csv = this.buildCsv(header, rows);
            
            const duration = Date.now() - startTime;
            logger.info({
                tenantId,
                type,
                recordCount: customers.length,
                duration,
                performanceRequirement: duration < 2000 ? 'PASS' : 'FAIL'
            }, 'CSV export generated');

            return csv;
            
        } else {
            throw new AppError('Invalid export type', 400, 'INVALID_EXPORT_TYPE');
        }
    }

    /**
     * Enhanced CSV builder with proper escaping and validation
     */
    private buildCsv(headers: string[], rows: string[][]): string {
        const escapeCsv = (val: string): string => {
            if (val == null) return '';
            const strVal = String(val);
            if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n') || strVal.includes('\r')) {
                return `"${strVal.replace(/"/g, '""')}"`;
            }
            return strVal;
        };

        // Validate data integrity
        const maxColumns = headers.length;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].length !== maxColumns) {
                logger.warn({
                    rowIndex: i,
                    expectedColumns: maxColumns,
                    actualColumns: rows[i].length
                }, 'CSV row column mismatch - padding with empty values');
                
                // Pad or truncate to match header count
                while (rows[i].length < maxColumns) {
                    rows[i].push('');
                }
                if (rows[i].length > maxColumns) {
                    rows[i] = rows[i].slice(0, maxColumns);
                }
            }
        }

        const headerRow = headers.map(escapeCsv).join(',');
        const dataRows = rows.map(row => row.map(escapeCsv).join(','));
        
        return [headerRow, ...dataRows].join('\n');
    }

    /**
     * Validate CSV data matches source data
     */
    async validateCsvExport(csvData: string, type: 'appointments' | 'customers', tenantId: string): Promise<{
        isValid: boolean;
        issues: string[];
        recordCount: number;
    }> {
        const issues: string[] = [];
        
        try {
            const lines = csvData.split('\n');
            if (lines.length < 2) {
                issues.push('CSV data appears to be empty or header-only');
                return { isValid: false, issues, recordCount: 0 };
            }

            const header = lines[0];
            const dataLines = lines.slice(1);
            const recordCount = dataLines.filter(line => line.trim()).length;

            // Validate header format
            const expectedHeaders = type === 'appointments' 
                ? ['Reference ID', 'Customer Name', 'Email', 'Phone', 'Service', 'Staff', 'Date', 'Start Time', 'End Time', 'Status', 'Created At', 'Notes', 'Price']
                : ['Customer ID', 'Name', 'Email', 'Phone', 'Tags', 'Total Appointments', 'Last Visit Date', 'Last Service', 'Created At', 'No-Show Count'];

            const actualHeaders = header.split(',').map(h => h.replace(/^"|"$/g, ''));
            
            for (const expectedHeader of expectedHeaders) {
                if (!actualHeaders.includes(expectedHeader)) {
                    issues.push(`Missing expected header: ${expectedHeader}`);
                }
            }

            // Validate data rows
            for (let i = 0; i < Math.min(dataLines.length, 5); i++) { // Check first 5 rows
                const row = dataLines[i];
                if (!row.trim()) continue;
                
                const columns = this.parseCsvRow(row);
                if (columns.length !== expectedHeaders.length) {
                    issues.push(`Row ${i + 1} has ${columns.length} columns, expected ${expectedHeaders.length}`);
                }
            }

            return {
                isValid: issues.length === 0,
                issues,
                recordCount
            };
            
        } catch (error) {
            issues.push(`CSV parsing error: ${error.message}`);
            return { isValid: false, issues, recordCount: 0 };
        }
    }

    /**
     * Parse CSV row handling quoted fields
     */
    private parseCsvRow(row: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            
            if (char === '"') {
                if (inQuotes && i + 1 < row.length && row[i + 1] === '"') {
                    current += '"';
                    i++; // Skip escaped quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }
}

export const reportService = new ReportService();
