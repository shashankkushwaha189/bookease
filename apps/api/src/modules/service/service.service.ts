import { ServiceRepository } from './service.repository';
import { createServiceSchema, updateServiceSchema } from './service.schema';
import { logger } from '@bookease/logger';

export class ServiceService {
    private repository = new ServiceRepository();

    async listServices(tenantId: string, activeOnly: boolean = false) {
        return this.repository.findAll(tenantId, activeOnly);
    }

    async getService(id: string, tenantId: string) {
        return this.repository.findById(id, tenantId);
    }

    async createService(tenantId: string, data: any) {
        const existing = await this.repository.findByName(tenantId, data.name);
        if (existing) {
            const error = new Error('Service with this name already exists');
            (error as any).code = 'DUPLICATE_NAME';
            throw error;
        }

        return this.repository.create({
            ...data,
            tenantId,
        });
    }

    async updateService(id: string, tenantId: string, data: any) {
        if (data.name) {
            const existing = await this.repository.findByName(tenantId, data.name);
            if (existing && existing.id !== id) {
                const error = new Error('Service with this name already exists');
                (error as any).code = 'DUPLICATE_NAME';
                throw error;
            }
        }

        await this.repository.update(id, tenantId, data);
        return this.getService(id, tenantId);
    }

    async softDeleteService(id: string, tenantId: string) {
        return this.repository.delete(id, tenantId);
    }
}

export const serviceService = new ServiceService();
