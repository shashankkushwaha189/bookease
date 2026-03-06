"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const import_controller_1 = require("./import.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const errors_1 = require("../../lib/errors");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Configure Multer (Memory allocation, 50MB limit for large files)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50 MB - increased for large CSV files
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        }
        else {
            cb(new errors_1.AppError('Only CSV files are allowed', 400, 'INVALID_FILE_TYPE'));
        }
    }
});
router.use(auth_middleware_1.authMiddleware);
router.use((0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN)); // ADMIN only
// Validation endpoints
router.post('/customers/validate', upload.single('file'), import_controller_1.importController.validateCustomers);
router.post('/services/validate', upload.single('file'), import_controller_1.importController.validateServices);
router.post('/staff/validate', upload.single('file'), import_controller_1.importController.validateStaff);
// Import endpoints with partial support
router.post('/customers', upload.single('file'), import_controller_1.importController.customers);
router.post('/services', upload.single('file'), import_controller_1.importController.services);
router.post('/staff', upload.single('file'), import_controller_1.importController.staff);
// Utility endpoints
router.get('/history', import_controller_1.importController.getHistory);
router.get('/templates', import_controller_1.importController.getTemplates);
exports.default = router;
