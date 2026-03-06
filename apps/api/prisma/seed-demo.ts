import { UserRole, AppointmentStatus, TimelineEvent, RecurringFrequency } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { addDays, setHours, setMinutes, subDays, addHours } from 'date-fns';
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('Starting demo seed 🌱');

    // Clear existing demographic-specific data safely.
    // Ensure we delete backwards through foreign keys to avoid deadlocks.
    await prisma.aiSummary.deleteMany({});
    await prisma.appointmentTimeline.deleteMany({});
    await prisma.appointmentArchive.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.consentRecord.deleteMany({});
    await prisma.slotLock.deleteMany({});
    await prisma.staffTimeOff.deleteMany({});
    await prisma.staffBreak.deleteMany({});
    await prisma.weeklySchedule.deleteMany({});
    await prisma.staffService.deleteMany({});
    await prisma.staff.deleteMany({});
    await prisma.service.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.tenantConfig.deleteMany({});
    await prisma.apiToken.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.businessProfile.deleteMany({});
    await prisma.tenant.deleteMany({ where: { slug: 'demo-clinic' } });

    // 1. Create Demo Tenant
    const tenant = await prisma.tenant.create({
        data: {
            id: 'b18e0808-27d1-4253-aca9-453897585106', // Use the hardcoded ID that frontend expects
            name: 'HealthFirst Clinic',
            slug: 'demo-clinic',
            timezone: 'Asia/Kolkata',
        }
    });

    console.log(`Created Tenant: ${tenant.name}`);

    await prisma.tenantConfig.create({
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
    await prisma.businessProfile.create({
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
    const generalConsult = await prisma.service.create({
        data: {
            tenantId: tenant.id,
            name: 'General Consultation',
            description: 'Routine general health check and consultation.',
            durationMinutes: 30,
            price: 500
        }
    });

    const followUp = await prisma.service.create({
        data: {
            tenantId: tenant.id,
            name: 'Follow-up',
            description: 'Brief check-in post initial consultation.',
            durationMinutes: 15,
            price: 300
        }
    });

    const healthCheckup = await prisma.service.create({
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
    const priya = await prisma.staff.create({
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

    const rohan = await prisma.staff.create({
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
        await prisma.weeklySchedule.create({
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

        await prisma.weeklySchedule.create({
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
        prisma.customer.create({ data: { tenantId: tenant.id, name: 'Ananya Gupta', email: 'ananya@demo.com', phone: '9000000001' } }),
        prisma.customer.create({ data: { tenantId: tenant.id, name: 'Vikram Singh', email: 'vikram@demo.com', phone: '9000000002' } }),
        prisma.customer.create({ data: { tenantId: tenant.id, name: 'Kavita Iyer', email: 'kavita@demo.com', phone: '9000000003' } }),
        prisma.customer.create({ data: { tenantId: tenant.id, name: 'Arjun Reddy', email: 'arjun@demo.com', phone: '9000000004' } }),
        prisma.customer.create({ data: { tenantId: tenant.id, name: 'Sneha Patel', email: 'sneha@demo.com', phone: '9000000005' } }),
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
        const apptDate = addDays(now, (i % 7) + 1);
        const startTimeUtc = setMinutes(setHours(apptDate, 10 + (i % 6)), 0);
        const endTimeUtc = setMinutes(startTimeUtc, service.durationMinutes);

        const status = i % 3 === 0 ? AppointmentStatus.CONFIRMED : AppointmentStatus.BOOKED;

        const appt = await prisma.appointment.create({
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
        await prisma.appointmentTimeline.create({
            data: {
                appointmentId: appt.id,
                tenantId: tenant.id,
                eventType: TimelineEvent.CREATED,
                performedBy: 'PUBLIC',
                note: 'Booked via public portal'
            }
        });

        if (status === AppointmentStatus.CONFIRMED) {
            await prisma.appointmentTimeline.create({
                data: {
                    appointmentId: appt.id,
                    tenantId: tenant.id,
                    eventType: TimelineEvent.CONFIRMED,
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
        const apptDate = subDays(now, (i % 14) + 1);
        const startTimeUtc = setMinutes(setHours(apptDate, 10 + (i % 6)), 0);
        const endTimeUtc = setMinutes(startTimeUtc, service.durationMinutes);

        let status: AppointmentStatus = AppointmentStatus.COMPLETED;
        if (i === 4 || i === 8) status = AppointmentStatus.CANCELLED;
        if (i === 10) status = AppointmentStatus.NO_SHOW;

        const appt = await prisma.appointment.create({
            data: {
                tenantId: tenant.id,
                serviceId: service.id,
                staffId: staff.id,
                customerId: customer.id,
                referenceId: `PST-${i.toString().padStart(4, '0')}`,
                startTimeUtc,
                endTimeUtc,
                status,
                notes: status === AppointmentStatus.COMPLETED ? 'Patient recovering well.' : null
            }
        });

        await prisma.appointmentTimeline.create({
            data: {
                appointmentId: appt.id,
                tenantId: tenant.id,
                eventType: TimelineEvent.CREATED,
                performedBy: 'PUBLIC'
            }
        });

        if (status === AppointmentStatus.COMPLETED) {
            await prisma.appointmentTimeline.create({
                data: {
                    appointmentId: appt.id,
                    tenantId: tenant.id,
                    eventType: TimelineEvent.COMPLETED,
                    performedBy: priya.id
                }
            });

            // Add an AI summary to showcase the module mapping
            if (i === 1 || i === 2) {
                await prisma.aiSummary.create({
                    data: {
                        appointmentId: appt.id,
                        tenantId: tenant.id,
                        summary: "The patient arrived for a follow-up consultation and is recovering well. Vitals are normal.",
                        confidence: "HIGH",
                        model: "mock-model",
                        accepted: true
                    }
                });
                await prisma.appointmentTimeline.create({
                    data: {
                        appointmentId: appt.id,
                        tenantId: tenant.id,
                        eventType: TimelineEvent.AI_SUMMARY_GENERATED,
                        performedBy: 'SYSTEM'
                    }
                });
            }
        }
    }

    // 9 & 10. Demo Users (Admin, Staff, and Customer)
    const passwordHash = await bcrypt.hash('demo123456', 10);

    await prisma.user.create({
        data: {
            tenantId: tenant.id,
            email: 'admin@demo.com',
            passwordHash,
            role: UserRole.ADMIN,
        }
    });

    const staffUser = await prisma.user.create({
        data: {
            tenantId: tenant.id,
            email: 'staff@demo.com',
            passwordHash,
            role: UserRole.STAFF,
        }
    });

    // Create customer user
    await prisma.user.create({
        data: {
            tenantId: tenant.id,
            email: 'customer@demo.com',
            passwordHash,
            role: UserRole.USER,
        }
    });

    // Link one of the staff profiles to the login user account natively
    await prisma.staff.update({
        where: { id: priya.id },
        data: { userId: staffUser.id }
    });

    console.log('Created Demo Users (admin@demo.com, staff@demo.com, customer@demo.com [demo123456])');
    console.log('🌱 Seed demo completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
