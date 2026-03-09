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

    async getProfileBySlug(tenantSlug: string) {
        const profile = await this.repository.findByTenantSlug(tenantSlug);
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

        // Return safe subset with SEO metadata
        return {
            businessName: profile.businessName,
            logoUrl: profile.logoUrl,
            description: profile.description,
            phone: profile.phone,
            email: profile.email,
            address: profile.address,
            brandColor: profile.brandColor,
            accentColor: profile.accentColor,
            policyText: profile.policyText,
            seoTitle: profile.seoTitle,
            seoDescription: profile.seoDescription,
        };
    }

    async getPublicProfileBySlug(tenantSlug: string) {
        const profile = await this.getProfileBySlug(tenantSlug);

        // Return safe subset with SEO metadata
        return {
            businessName: profile.businessName,
            logoUrl: profile.logoUrl,
            description: profile.description,
            phone: profile.phone,
            email: profile.email,
            address: profile.address,
            brandColor: profile.brandColor,
            accentColor: profile.accentColor,
            policyText: profile.policyText,
            seoTitle: profile.seoTitle,
            seoDescription: profile.seoDescription,
        };
    }

    async updateBranding(tenantId: string, brandingData: {
        brandColor?: string;
        accentColor?: string;
        logoUrl?: string;
    }) {
        await this.getProfile(tenantId); // Check existence
        return this.repository.update(tenantId, brandingData);
    }

    async updatePolicy(tenantId: string, policyData: {
        policyText?: string;
    }) {
        await this.getProfile(tenantId); // Check existence
        return this.repository.update(tenantId, policyData);
    }

    async updateSEO(tenantId: string, seoData: {
        seoTitle?: string;
        seoDescription?: string;
    }) {
        await this.getProfile(tenantId); // Check existence
        return this.repository.update(tenantId, seoData);
    }

    async updateContact(tenantId: string, contactData: {
        phone?: string;
        email?: string;
        address?: string;
    }) {
        await this.getProfile(tenantId); // Check existence
        return this.repository.update(tenantId, contactData);
    }

    async validateProfileAccess(tenantId: string, requestedTenantSlug?: string): Promise<boolean> {
        try {
            const profile = await this.getProfile(tenantId);
            
            // Additional validation can be added here
            return true;
        } catch (error) {
            return false;
        }
    }

    async searchProfiles(query: string, limit: number = 10) {
        return this.repository.search(query, limit);
    }

    async getProfileWithTenant(tenantId: string) {
        const profile = await this.repository.findByTenantIdWithTenant(tenantId);
        if (!profile) {
            const error = new Error('Business profile not found');
            (error as any).code = 'NOT_FOUND';
            (error as any).status = 404;
            throw error;
        }
        return profile;
    }
}
