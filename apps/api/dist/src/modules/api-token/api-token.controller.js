"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiTokenController = exports.ApiTokenController = void 0;
const api_token_service_1 = require("./api-token.service");
const errors_1 = require("../../lib/errors");
class ApiTokenController {
    create = async (req, res, next) => {
        try {
            const tenantId = req.tenantId;
            const { name } = req.body;
            if (!name) {
                throw new errors_1.AppError('Token name is required', 400, 'MISSING_NAME');
            }
            const tokenData = await api_token_service_1.apiTokenService.createToken(tenantId, name);
            return res.status(201).json({ success: true, data: tokenData });
        }
        catch (error) {
            next(error);
        }
    };
    list = async (req, res, next) => {
        try {
            const tenantId = req.tenantId;
            const tokens = await api_token_service_1.apiTokenService.listTokens(tenantId);
            return res.status(200).json({ success: true, data: tokens });
        }
        catch (error) {
            next(error);
        }
    };
    revoke = async (req, res, next) => {
        try {
            const tenantId = req.tenantId;
            const tokenId = req.params.id;
            if (!tokenId) {
                throw new errors_1.AppError('Token ID is required', 400, 'MISSING_ID');
            }
            const result = await api_token_service_1.apiTokenService.revokeToken(tenantId, tokenId);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.ApiTokenController = ApiTokenController;
exports.apiTokenController = new ApiTokenController();
