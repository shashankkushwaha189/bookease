"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditController = exports.AuditController = void 0;
const audit_service_1 = require("./audit.service");
class AuditController {
    getLogs = async (req, res) => {
        try {
            const tenantId = String(req.headers['x-tenant-id'] || '');
            const { page = 1, limit = 10, action } = req.query;
            const logs = await audit_service_1.auditService.getLogs({
                tenantId,
                page: Number(page),
                limit: Number(limit),
                action: action,
            });
            res.json(logs);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    };
}
exports.AuditController = AuditController;
exports.auditController = new AuditController();
