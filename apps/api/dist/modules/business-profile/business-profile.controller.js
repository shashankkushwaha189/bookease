"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessProfileController = void 0;
class BusinessProfileController {
    service;
    constructor(service) {
        this.service = service;
    }
    // Protected endpoints (auth required)
    getProfile = async (req, res, next) => {
        try {
            const profile = await this.service.getProfile(req.tenantId);
            res.json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            next(error);
        }
    };
    upsertProfile = async (req, res, next) => {
        try {
            const profile = await this.service.upsertProfile(req.tenantId, req.body);
            res.json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            next(error);
        }
    };
    updateProfile = async (req, res, next) => {
        try {
            const profile = await this.service.updateProfile(req.tenantId, req.body);
            res.json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            next(error);
        }
    };
    updateBranding = async (req, res, next) => {
        try {
            const profile = await this.service.updateBranding(req.tenantId, req.body);
            res.json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            next(error);
        }
    };
    updatePolicy = async (req, res, next) => {
        try {
            const profile = await this.service.updatePolicy(req.tenantId, req.body);
            res.json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            next(error);
        }
    };
    updateSEO = async (req, res, next) => {
        try {
            const profile = await this.service.updateSEO(req.tenantId, req.body);
            res.json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            next(error);
        }
    };
    updateContact = async (req, res, next) => {
        try {
            const profile = await this.service.updateContact(req.tenantId, req.body);
            res.json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            next(error);
        }
    };
    // Public endpoints (no auth required)
    getPublicProfile = async (req, res, next) => {
        try {
            const profile = await this.service.getPublicProfile(req.tenantId);
            res.json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getPublicProfileBySlug = async (req, res, next) => {
        try {
            const { slug } = req.params;
            const profile = await this.service.getPublicProfileBySlug(slug);
            res.json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getPublicProfiles = async (req, res, next) => {
        try {
            const { limit = 50 } = req.query;
            const profiles = await this.service.searchProfiles('', Number(limit));
            // Return only public-safe information
            const publicProfiles = profiles.map(profile => ({
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
                tenant: profile.tenant ? {
                    id: profile.tenant.id,
                    name: profile.tenant.name,
                    slug: profile.tenant.slug,
                    domain: profile.tenant.domain || null,
                } : null,
            }));
            res.json({
                success: true,
                data: publicProfiles,
            });
        }
        catch (error) {
            next(error);
        }
    };
    searchProfiles = async (req, res, next) => {
        try {
            const { query, limit = 10 } = req.query;
            const profiles = await this.service.searchProfiles(query, Number(limit));
            // Return only public-safe information
            const publicProfiles = profiles.map(profile => ({
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
                tenant: profile.tenant ? {
                    id: profile.tenant.id,
                    name: profile.tenant.name,
                    slug: profile.tenant.slug,
                    domain: profile.tenant.domain || null,
                } : null,
            }));
            res.json({
                success: true,
                data: publicProfiles,
            });
        }
        catch (error) {
            next(error);
        }
    };
    // Validation endpoint
    validateProfileAccess = async (req, res, next) => {
        try {
            const tenantId = req.headers['x-tenant-id'];
            const { tenantSlug } = req.query;
            const isValid = await this.service.validateProfileAccess(tenantId, tenantSlug);
            res.json({
                success: true,
                data: { isValid, tenantId },
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.BusinessProfileController = BusinessProfileController;
