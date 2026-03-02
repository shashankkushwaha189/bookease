import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

export class StaffRepository {
    async findAll(tenantId: string, activeOnly: boolean = false) {
        return prisma.staff.findMany({
            where: {
                tenantId,
                ...(activeOnly ? { isActive: true, deletedAt: null } : { deletedAt: null }),
            },
            include: {
                staffServices: {
                    include: {
                        service: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.staff.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                staffServices: {
                    include: { service: true },
                },
                weeklySchedule: {
                    include: { breaks: true },
                },
                timeOffs: true,
            },
        });
    }

    async create(data: any) {
        return prisma.staff.create({ data });
    }

    async update(id: string, tenantId: string, data: any) {
        return prisma.staff.updateMany({
            where: { id, tenantId },
            data,
        });
    }

    async softDelete(id: string, tenantId: string) {
        return prisma.staff.updateMany({
            where: { id, tenantId },
            data: { isActive: false, deletedAt: new Date() },
        });
    }

    async updateSchedule(staffId: string, schedules: any[]) {
        return prisma.$transaction(async (tx) => {
            // Clear existing schedule and breaks
            await tx.staffBreak.deleteMany({
                where: { weeklySchedule: { staffId } },
            });
            await tx.weeklySchedule.deleteMany({
                where: { staffId },
            });

            // Create new ones
            for (const s of schedules) {
                const schedule = await tx.weeklySchedule.create({
                    data: {
                        staffId,
                        dayOfWeek: s.dayOfWeek,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        isWorking: s.isWorking,
                    },
                });

                if (s.breaks && s.breaks.length > 0) {
                    await tx.staffBreak.createMany({
                        data: s.breaks.map((b: any) => ({
                            weeklyScheduleId: schedule.id,
                            startTime: b.startTime,
                            endTime: b.endTime,
                        })),
                    });
                }
            }
        });
    }

    async assignServices(staffId: string, serviceIds: string[]) {
        return prisma.$transaction(async (tx) => {
            await tx.staffService.deleteMany({ where: { staffId } });
            await tx.staffService.createMany({
                data: serviceIds.map((id) => ({ staffId, serviceId: id })),
            });
        });
    }

    async addTimeOff(staffId: string, data: any) {
        return prisma.staffTimeOff.create({
            data: {
                staffId,
                date: new Date(data.date),
                endDate: data.endDate ? new Date(data.endDate) : null,
                reason: data.reason,
            },
        });
    }
}
