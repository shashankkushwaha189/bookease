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
exports.BusinessProfileService = BusinessProfileService;
