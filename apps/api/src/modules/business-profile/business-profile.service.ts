import { BusinessProfileRepository } from './business-profile.repository';
import { CreateBusinessProfileInput, UpdateBusinessProfileInput } from './business-profile.schema';

export class BusinessProfileService {
    constructor(private repository: BusinessProfileRepository) { }

    async getProfile(tenantId: string) {
        const profile = await this.repository.findByTenantId(tenantId);
        if (!profile) {
            const error = new Error('Business profile not found');
            (error as any).code = 'NOT_FOUND';
            (error as any).status = 404;
            throw error;
        }
        return profile;
    }

    async upsertProfile(tenantId: string, data: CreateBusinessProfileInput) {
        const existing = await this.repository.findByTenantId(tenantId);
        if (existing) {
            return this.repository.update(tenantId, data);
        }
        return this.repository.create(tenantId, data);
    }

    async updateProfile(tenantId: string, data: UpdateBusinessProfileInput) {
        await this.getProfile(tenantId); // Check existence
        return this.repository.update(tenantId, data);
    }

    async getPublicProfile(tenantId: string) {
        const profile = await this.getProfile(tenantId);

        // Return safe subset
        return {
            businessName: profile.businessName,
            logoUrl: profile.logoUrl,
            description: profile.description,
            phone: profile.phone,
            email: profile.email,
            brandColor: profile.brandColor,
            accentColor: profile.accentColor,
            policyText: profile.policyText,
        };
    }
}
