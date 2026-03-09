import { Request, Response, NextFunction } from 'express';
import { BusinessProfileService } from './business-profile.service';

export class BusinessProfileController {
    constructor(private service: BusinessProfileService) { }

    // Protected endpoints (auth required)
    getProfile = async (req: Request, res: Response, next: NextFunction) => {
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

    upsertProfile = async (req: Request, res: Response, next: NextFunction) => {
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

    updateProfile = async (req: Request, res: Response, next: NextFunction) => {
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

    updateBranding = async (req: Request, res: Response, next: NextFunction) => {
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

    updatePolicy = async (req: Request, res: Response, next: NextFunction) => {
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

    updateSEO = async (req: Request, res: Response, next: NextFunction) => {
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

    updateContact = async (req: Request, res: Response, next: NextFunction) => {
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
            const profile = await this.service.getPublicProfile(req.tenantId!);
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
            const { slug } = req.params;
            const profile = await this.service.getPublicProfileBySlug(slug as string);
            res.json({
                success: true,
                data: profile,
            });
        } catch (error) {
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
