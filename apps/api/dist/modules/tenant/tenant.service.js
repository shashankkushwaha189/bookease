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
    async getTenantBySlug(slug) {
        const tenant = await this.repository.findBySlug(slug);
        if (!tenant) {
            const error = new Error('Tenant not found');
            error.code = 'NOT_FOUND';
            error.status = 404;
            throw error;
        }
        return tenant;
    }
    async getTenantByDomain(domain) {
        const tenant = await this.repository.findByDomain(domain);
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
        await this.getTenant(id); // Check existence
        return this.repository.softDelete(id);
    }
    async restoreTenant(id) {
        const tenant = await this.repository.findById(id);
        if (!tenant) {
            const error = new Error('Tenant not found');
            error.code = 'NOT_FOUND';
            error.status = 404;
            throw error;
        }
        return this.repository.restore(id);
    }
    async getAllTenants() {
        return this.repository.list();
    }
    async getActiveTenants() {
        return this.repository.listActive();
    }
    async validateTenantAccess(tenantId, requestedSlug) {
        try {
            const tenant = await this.getTenant(tenantId);
            if (!tenant.isActive) {
                return false;
            }
            if (requestedSlug && tenant.slug !== requestedSlug) {
                return false;
            }
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async searchTenants(query, limit = 10) {
        return this.repository.search(query, limit);
    }
}
exports.TenantService = TenantService;
