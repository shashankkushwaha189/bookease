"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
const prisma_1 = require("../src/lib/prisma");
const helpers_1 = require("./helpers");
const client_1 = require("../src/generated/client");
(0, vitest_1.describe)('Policy Engine Integration', () => {
    let tenantId;
    let serviceId;
    let staffId;
    let customerId;
    let adminId;
    let staffUserId;
    (0, vitest_1.beforeAll)(async () => {
        await (0, helpers_1.cleanupDatabase)();
        // Setup shared data
        const tenant = await prisma_1.prisma.tenant.create({
            data: {
                name: 'Policy Test Clinic',
                slug: `policy-test-${Date.now()}`,
                timezone: 'UTC'
            }
        });
        tenantId = tenant.id;
        const service = await prisma_1.prisma.service.create({
            data: {
                tenantId,
                name: 'Policy Test Service',
                durationMinutes: 30
            }
        });
        serviceId = service.id;
        const staff = await prisma_1.prisma.staff.create({
            data: {
                tenantId,
                name: 'Policy Staff'
            }
        });
        staffId = staff.id;
        const customer = await prisma_1.prisma.customer.create({
            data: {
                tenantId,
                name: 'Policy Customer',
                email: 'policy@example.com'
            }
        });
        customerId = customer.id;
        const admin = await prisma_1.prisma.user.create({
            data: {
                tenantId,
                email: 'admin@policy.com',
                passwordHash: 'hash',
                role: client_1.UserRole.ADMIN
            }
        });
        adminId = admin.id;
        const staffUser = await prisma_1.prisma.user.create({
            data: {
                tenantId,
                email: 'staff@policy.com',
                passwordHash: 'hash',
                role: client_1.UserRole.STAFF
            }
        });
        staffUserId = staffUser.id;
        // Ensure default config exists
        await prisma_1.prisma.tenantConfig.create({
            data: {
                tenantId,
                version: 1,
                config: {
                    booking: { maxBookingsPerDay: 50, slotLockDurationMinutes: 25, allowGuestBooking: true },
                    cancellation: { allowedUntilHoursBefore: 24, maxReschedules: 1, noShowGracePeriodMinutes: 15 },
                    features: { aiSummaryEnabled: false, loadBalancingEnabled: false, recurringEnabled: true },
                    staff: { canCancelAppointments: true, canRescheduleAppointments: true }
                },
                createdBy: adminId,
                isActive: true
            }
        });
    });
    (0, vitest_1.it)('should reject staff cancellation within 24h window', async () => {
        const startTime = new Date();
        startTime.setHours(startTime.getHours() + 2); // 2 hours from now
        const appointment = await prisma_1.prisma.appointment.create({
            data: {
                tenantId, serviceId, staffId, customerId,
                referenceId: `POL-${Date.now()}-1`,
                startTimeUtc: startTime,
                endTimeUtc: new Date(startTime.getTime() + 30 * 60000),
                status: client_1.AppointmentStatus.BOOKED
            }
        });
        const res = await (0, supertest_1.default)(app_1.app)
            .post(`/api/appointments/${appointment.id}/cancel`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', staffUserId)
            .set('x-user-role', client_1.UserRole.STAFF);
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.error).toBe('Cancellation window has closed');
    });
    (0, vitest_1.it)('should allow admin override for cancellation within window', async () => {
        const startTime = new Date();
        startTime.setHours(startTime.getHours() + 2);
        const appointment = await prisma_1.prisma.appointment.create({
            data: {
                tenantId, serviceId, staffId, customerId,
                referenceId: `POL-${Date.now()}-2`,
                startTimeUtc: startTime,
                endTimeUtc: new Date(startTime.getTime() + 30 * 60000),
                status: client_1.AppointmentStatus.BOOKED
            }
        });
        const res = await (0, supertest_1.default)(app_1.app)
            .post(`/api/appointments/${appointment.id}/cancel`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', adminId)
            .set('x-user-role', client_1.UserRole.ADMIN)
            .send({ overrideReason: 'Emergency staff shortage override' });
        (0, vitest_1.expect)(res.status).toBe(200);
        const timeline = await prisma_1.prisma.appointmentTimeline.findFirst({
            where: { appointmentId: appointment.id, note: { contains: '[OVERRIDE]' } }
        });
        (0, vitest_1.expect)(timeline).toBeDefined();
        (0, vitest_1.expect)(timeline?.note).toContain('Emergency staff shortage override');
    });
    (0, vitest_1.it)('should reject reschedule if limit reached (maxReschedules: 1)', async () => {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() + 2); // Far in future to avoid cancellation window window check for staff
        const appointment = await prisma_1.prisma.appointment.create({
            data: {
                tenantId, serviceId, staffId, customerId,
                referenceId: `POL-${Date.now()}-3`,
                startTimeUtc: startTime,
                endTimeUtc: new Date(startTime.getTime() + 30 * 60000),
                status: client_1.AppointmentStatus.BOOKED
            }
        });
        // Add 1 reschedule to match limit
        await prisma_1.prisma.appointmentTimeline.create({
            data: {
                appointmentId: appointment.id,
                tenantId,
                eventType: client_1.TimelineEvent.RESCHEDULED,
                note: '[RESCHEDULE] Previous shift',
                performedBy: staffUserId
            }
        });
        const res = await (0, supertest_1.default)(app_1.app)
            .post(`/api/appointments/${appointment.id}/reschedule`)
            .set('x-tenant-id', tenantId)
            .set('x-user-id', staffUserId)
            .set('x-user-role', client_1.UserRole.STAFF)
            .send({
            startTimeUtc: new Date(startTime.getTime() + 3600000).toISOString(),
            endTimeUtc: new Date(startTime.getTime() + 3600000 + 1800000).toISOString()
        });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.error).toBe('Reschedule limit reached');
    });
    (0, vitest_1.it)('should mark past confirmed appointments as NO_SHOW via background job', async () => {
        const pastTime = new Date();
        pastTime.setMinutes(pastTime.getMinutes() - 30); // 30 mins ago (grace is 15)
        const appointment = await prisma_1.prisma.appointment.create({
            data: {
                tenantId, serviceId, staffId, customerId,
                referenceId: `POL-${Date.now()}-4`,
                startTimeUtc: pastTime,
                endTimeUtc: new Date(pastTime.getTime() + 30 * 60000),
                status: client_1.AppointmentStatus.CONFIRMED
            }
        });
        // Trigger job logic
        const { AppointmentService } = await Promise.resolve().then(() => __importStar(require('../src/modules/appointment/appointment.service')));
        const service = new AppointmentService();
        await service.markNoShows();
        const updated = await prisma_1.prisma.appointment.findUnique({ where: { id: appointment.id } });
        (0, vitest_1.expect)(updated?.status).toBe(client_1.AppointmentStatus.NO_SHOW);
    });
});
