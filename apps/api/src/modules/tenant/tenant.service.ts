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
        await this.getTenant(id);
        return this.repository.softDelete(id);
    }

    async getAllTenants() {
        return this.repository.list();
    }
}
