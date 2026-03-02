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
const router = (0, express_1.Router)();
// Configure Mutler (Memory allocation, 5MB limit)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
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
router.use((0, role_middleware_1.requireRole)('ADMIN')); // ADMIN only
router.post('/customers', upload.single('file'), import_controller_1.importController.customers);
router.post('/services', upload.single('file'), import_controller_1.importController.services);
router.post('/staff', upload.single('file'), import_controller_1.importController.staff);
exports.default = router;
