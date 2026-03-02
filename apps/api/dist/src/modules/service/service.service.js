"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceService = exports.ServiceService = void 0;
const service_repository_1 = require("./service.repository");
class ServiceService {
    repository = new service_repository_1.ServiceRepository();
    async listServices(tenantId, activeOnly = false) {
        return this.repository.findAll(tenantId, activeOnly);
    }
    async getService(id, tenantId) {
        return this.repository.findById(id, tenantId);
    }
    async createService(tenantId, data) {
        const existing = await this.repository.findByName(tenantId, data.name);
        if (existing) {
            const error = new Error('Service with this name already exists');
            error.code = 'DUPLICATE_NAME';
            throw error;
        }
        return this.repository.create({
            ...data,
            tenantId,
        });
    }
    async updateService(id, tenantId, data) {
        if (data.name) {
            const existing = await this.repository.findByName(tenantId, data.name);
            if (existing && existing.id !== id) {
                const error = new Error('Service with this name already exists');
                error.code = 'DUPLICATE_NAME';
                throw error;
            }
        }
        await this.repository.update(id, tenantId, data);
        return this.getService(id, tenantId);
    }
    async softDeleteService(id, tenantId) {
        return this.repository.delete(id, tenantId);
    }
}
exports.ServiceService = ServiceService;
exports.serviceService = new ServiceService();
