"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessProfileController = void 0;
class BusinessProfileController {
    service;
    constructor(service) {
        this.service = service;
    }
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
}
exports.BusinessProfileController = BusinessProfileController;
