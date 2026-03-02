"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffRepository = void 0;
const prisma_1 = require("../../lib/prisma");
class StaffRepository {
    async findAll(tenantId, activeOnly = false) {
        return prisma_1.prisma.staff.findMany({
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
    async findById(id, tenantId) {
        return prisma_1.prisma.staff.findFirst({
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
    async create(data) {
        return prisma_1.prisma.staff.create({ data });
    }
    async update(id, tenantId, data) {
        return prisma_1.prisma.staff.updateMany({
            where: { id, tenantId },
            data,
        });
    }
    async softDelete(id, tenantId) {
        return prisma_1.prisma.staff.updateMany({
            where: { id, tenantId },
            data: { isActive: false, deletedAt: new Date() },
        });
    }
    async updateSchedule(staffId, schedules) {
        return prisma_1.prisma.$transaction(async (tx) => {
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
                        data: s.breaks.map((b) => ({
                            weeklyScheduleId: schedule.id,
                            startTime: b.startTime,
                            endTime: b.endTime,
                        })),
                    });
                }
            }
        });
    }
    async assignServices(staffId, serviceIds) {
        return prisma_1.prisma.$transaction(async (tx) => {
            await tx.staffService.deleteMany({ where: { staffId } });
            await tx.staffService.createMany({
                data: serviceIds.map((id) => ({ staffId, serviceId: id })),
            });
        });
    }
    async addTimeOff(staffId, data) {
        return prisma_1.prisma.staffTimeOff.create({
            data: {
                staffId,
                date: new Date(data.date),
                endDate: data.endDate ? new Date(data.endDate) : null,
                reason: data.reason,
            },
        });
    }
}
exports.StaffRepository = StaffRepository;
