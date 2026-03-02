"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffService = exports.StaffService = void 0;
const staff_repository_1 = require("./staff.repository");
const prisma_1 = require("../../lib/prisma");
class StaffService {
    repository = new staff_repository_1.StaffRepository();
    async listStaff(tenantId, activeOnly = false) {
        return this.repository.findAll(tenantId, activeOnly);
    }
    async getStaff(id, tenantId) {
        return this.repository.findById(id, tenantId);
    }
    async createStaff(tenantId, data) {
        return this.repository.create({
            ...data,
            tenantId,
        });
    }
    async updateStaff(id, tenantId, data) {
        await this.repository.update(id, tenantId, data);
        return this.getStaff(id, tenantId);
    }
    async deleteStaff(id, tenantId) {
        return this.repository.softDelete(id, tenantId);
    }
    async assignServices(staffId, tenantId, serviceIds) {
        // Validate services belong to same tenant
        const services = await prisma_1.prisma.service.findMany({
            where: {
                id: { in: serviceIds },
                tenantId,
            },
        });
        if (services.length !== serviceIds.length) {
            throw new Error('One or more services do not belong to this tenant');
        }
        await this.repository.assignServices(staffId, serviceIds);
        return this.getStaff(staffId, tenantId);
    }
    async setSchedule(staffId, tenantId, schedules) {
        for (const s of schedules) {
            // 1. Working hours validation
            if (s.startTime >= s.endTime && s.isWorking) {
                throw new Error(`End time ${s.endTime} must be after start time ${s.startTime} for day ${s.dayOfWeek}`);
            }
            // 2. Breaks validation
            if (s.breaks) {
                for (const b of s.breaks) {
                    if (b.startTime < s.startTime || b.endTime > s.endTime) {
                        throw new Error(`Break ${b.startTime}-${b.endTime} must be within working hours ${s.startTime}-${s.endTime}`);
                    }
                    if (b.startTime >= b.endTime) {
                        throw new Error(`Break end time ${b.endTime} must be after start time ${b.startTime}`);
                    }
                }
                // 3. Overlapping breaks validation
                const sortedBreaks = [...s.breaks].sort((a, b) => a.startTime.localeCompare(b.startTime));
                for (let i = 0; i < sortedBreaks.length - 1; i++) {
                    if (sortedBreaks[i].endTime > sortedBreaks[i + 1].startTime) {
                        throw new Error('Breaks cannot overlap');
                    }
                }
            }
        }
        await this.repository.updateSchedule(staffId, schedules);
        return this.getStaff(staffId, tenantId);
    }
    async addTimeOff(staffId, tenantId, data) {
        await this.repository.addTimeOff(staffId, data);
        return this.getStaff(staffId, tenantId);
    }
}
exports.StaffService = StaffService;
exports.staffService = new StaffService();
