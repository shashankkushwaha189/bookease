"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessProfileService = void 0;
class BusinessProfileService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async getProfile(tenantId) {
        const profile = await this.repository.findByTenantId(tenantId);
        if (!profile) {
            const error = new Error('Business profile not found');
            error.code = 'NOT_FOUND';
            error.status = 404;
            throw error;
        }
        return profile;
    }
    async getProfileBySlug(tenantSlug) {
        const profile = await this.repository.findByTenantSlug(tenantSlug);
        if (!profile) {
            const error = new Error('Business profile not found');
            error.code = 'NOT_FOUND';
            error.status = 404;
            throw error;
        }
        return profile;
    }
    async upsertProfile(tenantId, data) {
        const existing = await this.repository.findByTenantId(tenantId);
        if (existing) {
            return this.repository.update(tenantId, data);
        }
        return this.repository.create(tenantId, data);
    }
    async updateProfile(tenantId, data) {
        await this.getProfile(tenantId); // Check existence
        return this.repository.update(tenantId, data);
    }
    async getPublicProfile(tenantId) {
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
    async getPublicProfileBySlug(tenantSlug) {
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
    async updateBranding(tenantId, brandingData) {
        await this.getProfile(tenantId); // Check existence
        return this.repository.update(tenantId, brandingData);
    }
    async updatePolicy(tenantId, policyData) {
        await this.getProfile(tenantId); // Check existence
        return this.repository.update(tenantId, policyData);
    }
    async updateSEO(tenantId, seoData) {
        await this.getProfile(tenantId); // Check existence
        return this.repository.update(tenantId, seoData);
    }
    async updateContact(tenantId, contactData) {
        await this.getProfile(tenantId); // Check existence
        return this.repository.update(tenantId, contactData);
    }
    async validateProfileAccess(tenantId, requestedTenantSlug) {
        try {
            const profile = await this.getProfile(tenantId);
            // Additional validation can be added here
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async searchProfiles(query, limit = 10) {
        return this.repository.search(query, limit);
    }
    async getProfileWithTenant(tenantId) {
        const profile = await this.repository.findByTenantIdWithTenant(tenantId);
        if (!profile) {
            const error = new Error('Business profile not found');
            error.code = 'NOT_FOUND';
            error.status = 404;
            throw error;
        }
        return profile;
    }
}
exports.BusinessProfileService = BusinessProfileService;
