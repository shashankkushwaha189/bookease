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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../src/generated/client");
const bcrypt = __importStar(require("bcrypt"));
const date_fns_1 = require("date-fns");
const prisma_1 = require("../src/lib/prisma");
async function main() {
    console.log('Starting demo seed 🌱');
    // Clear existing demographic-specific data safely.
    // Ensure we delete backwards through foreign keys to avoid deadlocks.
    await prisma_1.prisma.aiSummary.deleteMany({});
    await prisma_1.prisma.appointmentTimeline.deleteMany({});
    await prisma_1.prisma.appointmentArchive.deleteMany({});
    await prisma_1.prisma.appointment.deleteMany({});
    await prisma_1.prisma.consentRecord.deleteMany({});
    await prisma_1.prisma.slotLock.deleteMany({});
    await prisma_1.prisma.staffTimeOff.deleteMany({});
    await prisma_1.prisma.staffBreak.deleteMany({});
    await prisma_1.prisma.weeklySchedule.deleteMany({});
    await prisma_1.prisma.staffService.deleteMany({});
    await prisma_1.prisma.staff.deleteMany({});
    await prisma_1.prisma.service.deleteMany({});
    await prisma_1.prisma.customer.deleteMany({});
    await prisma_1.prisma.tenantConfig.deleteMany({});
    await prisma_1.prisma.apiToken.deleteMany({});
    await prisma_1.prisma.user.deleteMany({});
    await prisma_1.prisma.businessProfile.deleteMany({});
    await prisma_1.prisma.tenant.deleteMany({ where: { slug: 'demo-clinic' } });
    // 1. Create Demo Tenant
    const tenant = await prisma_1.prisma.tenant.create({
        data: {
            name: 'HealthFirst Clinic',
            slug: 'demo-clinic',
            timezone: 'Asia/Kolkata',
        }
    });
    console.log(`Created Tenant: ${tenant.name}`);
    await prisma_1.prisma.tenantConfig.create({
        data: {
            tenantId: tenant.id,
            version: 1,
            isActive: true,
            createdBy: 'SYSTEM',
            config: {
                features: {
                    aiSummaryEnabled: true,
                    auditLogging: true
                },
                booking: {
                    allowGuestBooking: true,
                    cancellationLeadTimeHours: 12
                }
            }
        }
    });
    // 2. Business Profile
    await prisma_1.prisma.businessProfile.create({
        data: {
            tenantId: tenant.id,
            businessName: 'HealthFirst Clinic (Demo)',
            description: 'Your premium local neighborhood healthcare provider.',
            phone: '+91-9876543210',
            email: 'hello@healthfirst.demo',
            address: '123 Health Ave, Mumbai 400001, India',
            brandColor: '#1A56DB',
            policyText: 'Please arrive 10 minutes prior to your appointment.'
        }
    });
    // 3. Three Services
    const generalConsult = await prisma_1.prisma.service.create({
        data: {
            tenantId: tenant.id,
            name: 'General Consultation',
            description: 'Routine general health check and consultation.',
            durationMinutes: 30,
            price: 500
        }
    });
    const followUp = await prisma_1.prisma.service.create({
        data: {
            tenantId: tenant.id,
            name: 'Follow-up',
            description: 'Brief check-in post initial consultation.',
            durationMinutes: 15,
            price: 300
        }
    });
    const healthCheckup = await prisma_1.prisma.service.create({
        data: {
            tenantId: tenant.id,
            name: 'Health Checkup',
            description: 'Comprehensive 60-minute full body screening.',
            durationMinutes: 60,
            price: 1500
        }
    });
    console.log('Created Services');
    // 4. Two Staff
    const priya = await prisma_1.prisma.staff.create({
        data: {
            tenantId: tenant.id,
            name: 'Dr. Priya Sharma',
            bio: 'Senior General Physician',
            staffServices: {
                create: [
                    { serviceId: generalConsult.id },
                    { serviceId: followUp.id },
                    { serviceId: healthCheckup.id }
                ]
            }
        }
    });
    const rohan = await prisma_1.prisma.staff.create({
        data: {
            tenantId: tenant.id,
            name: 'Dr. Rohan Mehta',
            bio: 'Diagnostics Specialist',
            staffServices: {
                create: [
                    { serviceId: healthCheckup.id }
                ]
            }
        }
    });
    console.log('Created Staff');
    // 5. Weekly Schedules (Mon-Sat 9am-6pm, Lunch 1-2pm)
    const days = [1, 2, 3, 4, 5, 6]; // Mon to Sat
    for (const day of days) {
        await prisma_1.prisma.weeklySchedule.create({
            data: {
                staffId: priya.id,
                dayOfWeek: day,
                startTime: '09:00',
                endTime: '18:00',
                breaks: {
                    create: [{ startTime: '13:00', endTime: '14:00' }]
                }
            }
        });
        await prisma_1.prisma.weeklySchedule.create({
            data: {
                staffId: rohan.id,
                dayOfWeek: day,
                startTime: '09:00',
                endTime: '18:00',
                breaks: {
                    create: [{ startTime: '13:00', endTime: '14:00' }]
                }
            }
        });
    }
    console.log('Created Schedules');
    // 8. 5 Customers
    const customers = await Promise.all([
        prisma_1.prisma.customer.create({ data: { tenantId: tenant.id, name: 'Ananya Gupta', email: 'ananya@demo.com', phone: '9000000001' } }),
        prisma_1.prisma.customer.create({ data: { tenantId: tenant.id, name: 'Vikram Singh', email: 'vikram@demo.com', phone: '9000000002' } }),
        prisma_1.prisma.customer.create({ data: { tenantId: tenant.id, name: 'Kavita Iyer', email: 'kavita@demo.com', phone: '9000000003' } }),
        prisma_1.prisma.customer.create({ data: { tenantId: tenant.id, name: 'Arjun Reddy', email: 'arjun@demo.com', phone: '9000000004' } }),
        prisma_1.prisma.customer.create({ data: { tenantId: tenant.id, name: 'Sneha Patel', email: 'sneha@demo.com', phone: '9000000005' } }),
    ]);
    // Helpers to generate dates
    const now = new Date();
    // 6. 20 Upcoming Appointments
    console.log('Generating Upcoming Appointments...');
    for (let i = 1; i <= 20; i++) {
        const customer = customers[i % 5];
        const staff = i % 2 === 0 ? rohan : priya;
        const service = staff.id === rohan.id ? healthCheckup : generalConsult;
        // Distribute across next 7 days, pick random hours between 10am and 5pm
        const apptDate = (0, date_fns_1.addDays)(now, (i % 7) + 1);
        const startTimeUtc = (0, date_fns_1.setMinutes)((0, date_fns_1.setHours)(apptDate, 10 + (i % 6)), 0);
        const endTimeUtc = (0, date_fns_1.setMinutes)(startTimeUtc, service.durationMinutes);
        const status = i % 3 === 0 ? client_1.AppointmentStatus.CONFIRMED : client_1.AppointmentStatus.BOOKED;
        const appt = await prisma_1.prisma.appointment.create({
            data: {
                tenantId: tenant.id,
                serviceId: service.id,
                staffId: staff.id,
                customerId: customer.id,
                referenceId: `UP-${i.toString().padStart(4, '0')}`,
                startTimeUtc,
                endTimeUtc,
                status
            }
        });
        // Add timeline creation bounds
        await prisma_1.prisma.appointmentTimeline.create({
            data: {
                appointmentId: appt.id,
                tenantId: tenant.id,
                eventType: client_1.TimelineEvent.CREATED,
                performedBy: 'PUBLIC',
                note: 'Booked via public portal'
            }
        });
        if (status === client_1.AppointmentStatus.CONFIRMED) {
            await prisma_1.prisma.appointmentTimeline.create({
                data: {
                    appointmentId: appt.id,
                    tenantId: tenant.id,
                    eventType: client_1.TimelineEvent.CONFIRMED,
                    performedBy: 'SYSTEM',
                }
            });
        }
    }
    // 7. 10 Past Appointments
    console.log('Generating Past Appointments...');
    for (let i = 1; i <= 10; i++) {
        const customer = customers[i % 5];
        const staff = priya; // Just priya to keep it simple
        const service = followUp;
        // Distribute across past 14 days
        const apptDate = (0, date_fns_1.subDays)(now, (i % 14) + 1);
        const startTimeUtc = (0, date_fns_1.setMinutes)((0, date_fns_1.setHours)(apptDate, 10 + (i % 6)), 0);
        const endTimeUtc = (0, date_fns_1.setMinutes)(startTimeUtc, service.durationMinutes);
        let status = client_1.AppointmentStatus.COMPLETED;
        if (i === 4 || i === 8)
            status = client_1.AppointmentStatus.CANCELLED;
        if (i === 10)
            status = client_1.AppointmentStatus.NO_SHOW;
        const appt = await prisma_1.prisma.appointment.create({
            data: {
                tenantId: tenant.id,
                serviceId: service.id,
                staffId: staff.id,
                customerId: customer.id,
                referenceId: `PST-${i.toString().padStart(4, '0')}`,
                startTimeUtc,
                endTimeUtc,
                status,
                notes: status === client_1.AppointmentStatus.COMPLETED ? 'Patient recovering well.' : null
            }
        });
        await prisma_1.prisma.appointmentTimeline.create({
            data: {
                appointmentId: appt.id,
                tenantId: tenant.id,
                eventType: client_1.TimelineEvent.CREATED,
                performedBy: 'PUBLIC'
            }
        });
        if (status === client_1.AppointmentStatus.COMPLETED) {
            await prisma_1.prisma.appointmentTimeline.create({
                data: {
                    appointmentId: appt.id,
                    tenantId: tenant.id,
                    eventType: client_1.TimelineEvent.COMPLETED,
                    performedBy: priya.id
                }
            });
            // Add an AI summary to showcase the module mapping
            if (i === 1 || i === 2) {
                await prisma_1.prisma.aiSummary.create({
                    data: {
                        appointmentId: appt.id,
                        tenantId: tenant.id,
                        summary: "The patient arrived for a follow-up consultation and is recovering well. Vitals are normal.",
                        confidence: "HIGH",
                        model: "mock-model",
                        accepted: true
                    }
                });
                await prisma_1.prisma.appointmentTimeline.create({
                    data: {
                        appointmentId: appt.id,
                        tenantId: tenant.id,
                        eventType: client_1.TimelineEvent.AI_SUMMARY_GENERATED,
                        performedBy: 'SYSTEM'
                    }
                });
            }
        }
    }
    // 9 & 10. Demo Users (Admin and Staff)
    const passwordHash = await bcrypt.hash('demo123456', 10);
    await prisma_1.prisma.user.create({
        data: {
            tenantId: tenant.id,
            email: 'admin@demo.com',
            passwordHash,
            role: client_1.UserRole.ADMIN,
        }
    });
    const staffUser = await prisma_1.prisma.user.create({
        data: {
            tenantId: tenant.id,
            email: 'staff@demo.com',
            passwordHash,
            role: client_1.UserRole.STAFF,
        }
    });
    // Link one of the staff profiles to the login user account natively
    await prisma_1.prisma.staff.update({
        where: { id: priya.id },
        data: { userId: staffUser.id }
    });
    console.log('Created Demo Users (admin@demo.com & staff@demo.com [demo123456])');
    console.log('🌱 Seed demo completed successfully.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma_1.prisma.$disconnect();
});
