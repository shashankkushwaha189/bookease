import { TenantRepository } from './tenant.repository';
import { CreateTenantInput, UpdateTenantInput } from './tenant.schema';

export class TenantService {
    constructor(private repository: TenantRepository) { }

    async createTenant(data: CreateTenantInput) {
        const existing = await this.repository.findBySlug(data.slug);
        if (existing) {
            const error = new Error('Tenant with this slug already exists');
            (error as any).code = 'CONFLICT';
            (error as any).status = 409;
            throw error;
        }
        return this.repository.create(data);
    }

    async getTenant(id: string) {
        const tenant = await this.repository.findById(id);
        if (!tenant) {
            const error = new Error('Tenant not found');
            (error as any).code = 'NOT_FOUND';
            (error as any).status = 404;
            throw error;
        }
        return tenant;
    }

    async getTenantBySlug(slug: string) {
        const tenant = await this.repository.findBySlug(slug);
        if (!tenant) {
            const error = new Error('Tenant not found');
            (error as any).code = 'NOT_FOUND';
            (error as any).status = 404;
            throw error;
        }
        return tenant;
    }

    async getTenantByDomain(domain: string) {
        const tenant = await this.repository.findByDomain(domain);
        if (!tenant) {
            const error = new Error('Tenant not found');
            (error as any).code = 'NOT_FOUND';
            (error as any).status = 404;
            throw error;
        }
        return tenant;
    }

    async updateTenant(id: string, data: UpdateTenantInput) {
        await this.getTenant(id); // Check existence

        if (data.slug) {
            const existing = await this.repository.findBySlug(data.slug);
            if (existing && existing.id !== id) {
                const error = new Error('Slug already in use by another tenant');
                (error as any).code = 'CONFLICT';
                (error as any).status = 409;
                throw error;
            }
        }
        return this.repository.update(id, data);
    }

    async deleteTenant(id: string) {
        await this.getTenant(id); // Check existence
        return this.repository.softDelete(id);
    }

    async restoreTenant(id: string) {
        const tenant = await this.repository.findById(id);
        if (!tenant) {
            const error = new Error('Tenant not found');
            (error as any).code = 'NOT_FOUND';
            (error as any).status = 404;
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

    async validateTenantAccess(tenantId: string, requestedSlug?: string): Promise<boolean> {
        try {
            const tenant = await this.getTenant(tenantId);
            
            if (!tenant.isActive) {
                return false;
            }

            if (requestedSlug && tenant.slug !== requestedSlug) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    async searchTenants(query: string, limit: number = 10) {
        return this.repository.search(query, limit);
    }
}
