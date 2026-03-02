import { StaffRepository } from './staff.repository';
import { prisma } from '../../lib/prisma';
import { logger } from '@bookease/logger';

export class StaffService {
    private repository = new StaffRepository();

    async listStaff(tenantId: string, activeOnly: boolean = false) {
        return this.repository.findAll(tenantId, activeOnly);
    }

    async getStaff(id: string, tenantId: string) {
        return this.repository.findById(id, tenantId);
    }

    async createStaff(tenantId: string, data: any) {
        return this.repository.create({
            ...data,
            tenantId,
        });
    }

    async updateStaff(id: string, tenantId: string, data: any) {
        await this.repository.update(id, tenantId, data);
        return this.getStaff(id, tenantId);
    }

    async deleteStaff(id: string, tenantId: string) {
        return this.repository.softDelete(id, tenantId);
    }

    async assignServices(staffId: string, tenantId: string, serviceIds: string[]) {
        // Validate services belong to same tenant
        const services = await prisma.service.findMany({
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

    async setSchedule(staffId: string, tenantId: string, schedules: any[]) {
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

    async addTimeOff(staffId: string, tenantId: string, data: any) {
        await this.repository.addTimeOff(staffId, data);
        return this.getStaff(staffId, tenantId);
    }
}

export const staffService = new StaffService();
