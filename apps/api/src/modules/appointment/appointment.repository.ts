import { prisma } from "../../lib/prisma";
import { AppointmentStatus, Prisma, RecurringFrequency, TimelineEvent } from "@prisma/client";

export class AppointmentRepository {
    async createWithLockAndConsent(data: {
        tenantId: string;
        serviceId: string;
        staffId: string;
        customerId: string;
        startTimeUtc: Date;
        endTimeUtc: Date;
        referenceId: string;
        notes?: string;
        createdBy?: string;
        consentGiven: boolean;
        ipAddress: string;
        policyVersion: string;
    }) {
        return prisma.$transaction(async (tx) => {
            // 1. Double-booking check (final line of defense)
            const existing = await tx.appointment.findFirst({
                where: {
                    tenantId: data.tenantId,
                    staffId: data.staffId,
                    startTimeUtc: data.startTimeUtc,
                    status: { not: AppointmentStatus.CANCELLED },
                },
            });

            if (existing) {
                throw new Error("SLOT_TAKEN");
            }

            // 2. Handle slot lock (final check or conversion)
            await tx.slotLock.upsert({
                where: {
                    tenantId_staffId_startTimeUtc: {
                        tenantId: data.tenantId,
                        staffId: data.staffId,
                        startTimeUtc: data.startTimeUtc,
                    }
                },
                update: {
                    sessionToken: "BOOKING_FINALIZED",
                    expiresAt: new Date(Date.now() + 25 * 60000),
                },
                create: {
                    tenantId: data.tenantId,
                    staffId: data.staffId,
                    startTimeUtc: data.startTimeUtc,
                    endTimeUtc: data.endTimeUtc,
                    sessionToken: "BOOKING_FINALIZED",
                    expiresAt: new Date(Date.now() + 25 * 60000),
                },
            });

            // 3. Create Appointment
            const appointment = await tx.appointment.create({
                data: {
                    tenantId: data.tenantId,
                    serviceId: data.serviceId,
                    staffId: data.staffId,
                    customerId: data.customerId,
                    referenceId: data.referenceId,
                    startTimeUtc: data.startTimeUtc,
                    endTimeUtc: data.endTimeUtc,
                    notes: data.notes,
                    createdBy: data.createdBy,
                    status: AppointmentStatus.BOOKED,
                },
            });

            // 4. Create Timeline (Now handled by service)

            // 5. Create Consent Record
            if (data.consentGiven) {
                const profile = await tx.businessProfile.findFirst({
                    where: { tenantId: data.tenantId }
                });

                await tx.consentRecord.create({
                    data: {
                        tenantId: data.tenantId,
                        customerEmail: (await tx.customer.findUnique({ where: { id: data.customerId } }))?.email || "",
                        consentText: profile?.policyText || "Standard Policy",
                        ipAddress: data.ipAddress,
                    }
                });
            }

            return appointment;
        });
    }

    async createLock(data: {
        tenantId: string;
        staffId: string;
        startTimeUtc: Date;
        endTimeUtc: Date;
        sessionToken: string;
        expiresAt: Date;
    }) {
        return prisma.slotLock.create({
            data,
        });
    }

    async deleteLock(lockId: string) {
        return prisma.slotLock.delete({
            where: { id: lockId },
        });
    }

    async deleteExpiredLocks() {
        return prisma.slotLock.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
            },
        });
    }

    async findAppointments(filters: {
        tenantId: string;
        date?: string;
        staffId?: string;
        status?: AppointmentStatus;
        isArchived?: boolean;
        skip: number;
        take: number;
    }) {
        const where: Prisma.AppointmentWhereInput = {
            tenantId: filters.tenantId,
        };

        if (filters.staffId) {
            where.staffId = filters.staffId;
        }

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.date) {
            const startOfDay = new Date(filters.date);
            const endOfDay = new Date(filters.date);
            endOfDay.setHours(23, 59, 59, 999);
            where.startTimeUtc = {
                gte: startOfDay,
                lte: endOfDay,
            };
        }

        const targetModel = filters.isArchived ? prisma.appointmentArchive : prisma.appointment;

        const includeObj: any = {
            service: true,
            staff: true,
            customer: true,
        };
        if (!filters.isArchived) {
            includeObj.timeline = true;
        }

        const [total, items] = await Promise.all([
            (targetModel as any).count({ where }),
            (targetModel as any).findMany({
                where,
                include: includeObj,
                orderBy: { startTimeUtc: "asc" },
                skip: filters.skip,
                take: filters.take,
            }),
        ]);

        return { total, items };
    }

    async findById(id: string) {
        return prisma.appointment.findUnique({
            where: { id },
            include: {
                service: true,
                staff: true,
                customer: true,
                timeline: true,
            },
        });
    }

    async updateStatus(
        id: string,
        status: AppointmentStatus,
        userId?: string,
        notes?: string
    ) {
        return prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.update({
                where: { id },
                data: { status },
            });

            // Note: Timeline handled by service

            return appointment;
        });
    }

    async getLastReferenceId(tenantId: string, year: number) {
        const prefix = `BK-${year}-`;
        const lastAppointment = await prisma.appointment.findFirst({
            where: {
                referenceId: { startsWith: prefix },
            },
            orderBy: { referenceId: "desc" },
            select: { referenceId: true },
        });

        return lastAppointment?.referenceId;
    }

    async countReschedules(appointmentId: string): Promise<number> {
        return prisma.appointmentTimeline.count({
            where: {
                appointmentId,
                note: {
                    startsWith: "[RESCHEDULE]",
                },
            },
        });
    }

    async findCustomerByEmail(tenantId: string, email: string) {
        return prisma.customer.findFirst({
            where: {
                tenantId,
                email,
            },
        });
    }

    async createCustomer(data: {
        tenantId: string;
        name: string;
        email: string;
        phone?: string;
    }) {
        return prisma.customer.create({
            data,
        });
    }

    async createRecurringSeries(data: {
        tenantId: string;
        frequency: RecurringFrequency;
        occurrences: number;
        appointments: Array<{
            serviceId: string;
            staffId: string;
            customerId: string;
            startTimeUtc: Date;
            endTimeUtc: Date;
            referenceIds: string[]; // references for each occurrence
            notes?: string;
            createdBy?: string;
        }>;
    }) {
        return prisma.$transaction(async (tx) => {
            const series = await tx.recurringAppointmentSeries.create({
                data: {
                    tenantId: data.tenantId,
                    frequency: data.frequency,
                    occurrences: data.occurrences,
                },
            });

            const createdAppointments = [];
            for (let i = 0; i < data.appointments.length; i++) {
                const appData = data.appointments[i];

                // Final double-booking check
                const existing = await tx.appointment.findFirst({
                    where: {
                        tenantId: data.tenantId,
                        staffId: appData.staffId,
                        startTimeUtc: appData.startTimeUtc,
                        status: { not: AppointmentStatus.CANCELLED },
                    },
                });

                if (existing) {
                    throw new Error(`SLOT_TAKEN:${appData.startTimeUtc.toISOString()}`);
                }

                const appointment = await tx.appointment.create({
                    data: {
                        tenantId: data.tenantId,
                        serviceId: appData.serviceId,
                        staffId: appData.staffId,
                        customerId: appData.customerId,
                        referenceId: appData.referenceIds[i],
                        startTimeUtc: appData.startTimeUtc,
                        endTimeUtc: appData.endTimeUtc,
                        notes: appData.notes,
                        createdBy: appData.createdBy,
                        status: AppointmentStatus.BOOKED,
                        seriesId: series.id,
                        seriesIndex: i,
                    },
                });

                // Timeline handled by service or caller

                createdAppointments.push(appointment);
            }

            return { series, appointments: createdAppointments };
        });
    }

    async cancelSeries(seriesId: string, fromIndex: number = 0, userId?: string) {
        return prisma.$transaction(async (tx) => {
            const appointments = await tx.appointment.findMany({
                where: {
                    seriesId,
                    seriesIndex: { gte: fromIndex },
                    status: { not: AppointmentStatus.CANCELLED },
                },
            });

            for (const app of appointments) {
                await tx.appointment.update({
                    where: { id: app.id },
                    data: { status: AppointmentStatus.CANCELLED },
                });

                // Timeline handled by service or caller
            }

            return { count: appointments.length };
        });
    }

    async rescheduleSeries(seriesId: string, fromIndex: number, newStartTimeUtc: Date, newEndTimeUtc: Date, userId?: string) {
        return prisma.$transaction(async (tx) => {
            const firstInSeries = await tx.appointment.findFirst({
                where: { seriesId, seriesIndex: fromIndex }
            });

            if (!firstInSeries) throw new Error("INITIAL_APPOINTMENT_NOT_FOUND");

            const timeOffset = newStartTimeUtc.getTime() - firstInSeries.startTimeUtc.getTime();

            const futureAppointments = await tx.appointment.findMany({
                where: {
                    seriesId,
                    seriesIndex: { gte: fromIndex },
                    status: { not: AppointmentStatus.CANCELLED },
                },
            });

            for (const app of futureAppointments) {
                const appNewStart = new Date(app.startTimeUtc.getTime() + timeOffset);
                const appNewEnd = new Date(app.endTimeUtc.getTime() + timeOffset);

                // Check collisions
                const collision = await tx.appointment.findFirst({
                    where: {
                        id: { not: app.id },
                        tenantId: app.tenantId,
                        staffId: app.staffId,
                        startTimeUtc: appNewStart,
                        status: { not: AppointmentStatus.CANCELLED },
                    },
                });

                if (collision) {
                    throw new Error(`SLOT_TAKEN:${appNewStart.toISOString()}`);
                }

                await tx.appointment.update({
                    where: { id: app.id },
                    data: {
                        startTimeUtc: appNewStart,
                        endTimeUtc: appNewEnd,
                    },
                });

                // Timeline handled by service or caller
            }

            return { count: futureAppointments.length };
        });
    }

    async rescheduleSingle(id: string, start: Date, end: Date, userId?: string, notes?: string) {
        return prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.update({
                where: { id },
                data: {
                    startTimeUtc: start,
                    endTimeUtc: end,
                },
            });

            // Timeline handled by service

            return appointment;
        });
    }
}
