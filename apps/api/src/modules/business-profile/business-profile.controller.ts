import { Request, Response, NextFunction } from 'express';
import { BusinessProfileService } from './business-profile.service';

// Extended Request interface for routes with tenant middleware
interface AuthenticatedRequest extends Request {
    tenantId?: string;
}

export class BusinessProfileController {
    constructor(private service: BusinessProfileService) { }

    // Protected endpoints (auth required)
    getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const profile = await this.service.getProfile(req.tenantId!);
            res.json({
                success: true,
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    };

    upsertProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const profile = await this.service.upsertProfile(req.tenantId!, req.body);
            res.json({
                success: true,
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    };

    updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const profile = await this.service.updateProfile(req.tenantId!, req.body);
            res.json({
                success: true,
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    };

    updateBranding = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const profile = await this.service.updateBranding(req.tenantId!, req.body);
            res.json({
                success: true,
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    };

    updatePolicy = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const profile = await this.service.updatePolicy(req.tenantId!, req.body);
            res.json({
                success: true,
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    };

    updateSEO = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const profile = await this.service.updateSEO(req.tenantId!, req.body);
            res.json({
                success: true,
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    };

    updateContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const profile = await this.service.updateContact(req.tenantId!, req.body);
            res.json({
                success: true,
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    };

    // Public endpoints (no auth required)
    getPublicProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // For public routes, extract tenant ID from headers (Express converts headers to lowercase)
            // If no tenant ID provided, return a default profile or error
            const tenantId = req.headers['x-tenant-id'] as string;
            
            console.log('🔍 Public Profile - tenantId from headers:', tenantId);
            
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'TENANT_ID_REQUIRED',
                        message: 'Tenant ID is required for public profile'
                    }
                });
            }
            
            console.log('🔍 Calling service.getPublicProfile with tenantId:', tenantId);
            const profile = await this.service.getPublicProfile(tenantId);
            res.json({
                success: true,
                data: profile,
            });
        } catch (error) {
            next(error);
        }
    };

    getPublicProfileBySlug = async (req: Request, res: Response, next: NextFunction) => {
        try {
            console.log('🔍 getPublicProfileBySlug called with slug:', req.params.slug);
            const { slug } = req.params;
            const profile = await this.service.getPublicProfileBySlug(slug as string);
            console.log('🔍 Profile found:', profile?.businessName);
            res.json({
                success: true,
                data: profile,
            });
        } catch (error) {
            console.error('🔍 Error in getPublicProfileBySlug:', error);
            next(error);
        }
    };

    getPublicProfiles = async (req: Request, res: Response, next: NextFunction) => {
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
                    id: (profile.tenant as any).id,
                    name: (profile.tenant as any).name,
                    slug: (profile.tenant as any).slug,
                    domain: (profile.tenant as any).domain || null,
                } : null,
            }));

            res.json({
                success: true,
                data: publicProfiles,
            });
        } catch (error) {
            next(error);
        }
    };

    searchProfiles = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { query, limit = 10 } = req.query;
            const profiles = await this.service.searchProfiles(query as string, Number(limit));
            
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
                    id: (profile.tenant as any).id,
                    name: (profile.tenant as any).name,
                    slug: (profile.tenant as any).slug,
                    domain: (profile.tenant as any).domain || null,
                } : null,
            }));

            res.json({
                success: true,
                data: publicProfiles,
            });
        } catch (error) {
            next(error);
        }
    };

    // Validation endpoint
    validateProfileAccess = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            const { tenantSlug } = req.query;
            
            const isValid = await this.service.validateProfileAccess(tenantId, tenantSlug as string);
            
            res.json({
                success: true,
                data: { isValid, tenantId },
            });
        } catch (error) {
            next(error);
        }
    };
}
