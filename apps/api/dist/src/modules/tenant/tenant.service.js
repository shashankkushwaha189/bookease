"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantService = void 0;
class TenantService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async createTenant(data) {
        const existing = await this.repository.findBySlug(data.slug);
        if (existing) {
            const error = new Error('Tenant with this slug already exists');
            error.code = 'CONFLICT';
            error.status = 409;
            throw error;
        }
        return this.repository.create(data);
    }
    async getTenant(id) {
        const tenant = await this.repository.findById(id);
        if (!tenant) {
            const error = new Error('Tenant not found');
            error.code = 'NOT_FOUND';
            error.status = 404;
            throw error;
        }
        return tenant;
    }
    async updateTenant(id, data) {
        await this.getTenant(id); // Check existence
        if (data.slug) {
            const existing = await this.repository.findBySlug(data.slug);
            if (existing && existing.id !== id) {
                const error = new Error('Slug already in use by another tenant');
                error.code = 'CONFLICT';
                error.status = 409;
                throw error;
            }
        }
        return this.repository.update(id, data);
    }
    async deleteTenant(id) {
        await this.getTenant(id);
        return this.repository.softDelete(id);
    }
    async getAllTenants() {
        return this.repository.list();
    }
}
exports.TenantService = TenantService;
