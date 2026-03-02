"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importController = exports.ImportController = void 0;
const import_service_1 = require("./import.service");
const errors_1 = require("../../lib/errors");
class ImportController {
    customers = async (req, res, next) => {
        try {
            const tenantId = req.tenantId;
            const file = req.file;
            if (!file) {
                throw new errors_1.AppError('No CSV file uploaded.', 400, 'NO_FILE');
            }
            const result = await import_service_1.importService.importCustomers(tenantId, file.buffer);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    };
    services = async (req, res, next) => {
        try {
            const tenantId = req.tenantId;
            const file = req.file;
            if (!file) {
                throw new errors_1.AppError('No CSV file uploaded.', 400, 'NO_FILE');
            }
            const result = await import_service_1.importService.importServices(tenantId, file.buffer);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    };
    staff = async (req, res, next) => {
        try {
            const tenantId = req.tenantId;
            const file = req.file;
            if (!file) {
                throw new errors_1.AppError('No CSV file uploaded.', 400, 'NO_FILE');
            }
            const result = await import_service_1.importService.importStaff(tenantId, file.buffer);
            return res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.ImportController = ImportController;
exports.importController = new ImportController();
