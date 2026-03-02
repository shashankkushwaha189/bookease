import { prisma } from '../src/lib/prisma';

/**
 * Cleans up all tables in the database to ensure a clean state for tests.
 * Uses TRUNCATE with CASCADE for efficiency and to handle foreign key constraints.
 */
export async function cleanupDatabase() {
    const tableNames = [
        'AuditLog', // Added AuditLog for new auditing table
        'AppointmentTimeline',
        'SlotLock',
        'StaffBreak',
        'Appointment',
        'StaffService',
        'StaffTimeOff',
        'WeeklySchedule',
        'Staff',
        'User',
        'Service',
        'Customer',
        'BusinessProfile',
        'ConsentRecord',
        'TenantConfig',
        'RecurringAppointmentSeries',
        'Tenant',
    ];

    for (const tableName of tableNames) {
        try {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE;`);
        } catch (error) {
            // Some tables might not exist yet or have different names in some environments
            // but CASCADE usually handles the dependencies.
        }
    }
}
