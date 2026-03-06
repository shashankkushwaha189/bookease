"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const archive_controller_1 = require("./archive.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Archive completed appointments (admin only)
router.post('/archive', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), archive_controller_1.archiveController.archiveAppointments);
// Search archived appointments
router.get('/search', auth_middleware_1.authMiddleware, archive_controller_1.archiveController.searchArchived);
// Get archive statistics (admin only)
router.get('/stats', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), archive_controller_1.archiveController.getArchiveStats);
// Restore archived appointment (admin only)
router.post('/restore/:archivedId', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), archive_controller_1.archiveController.restoreAppointment);
// Test archival performance (admin only)
router.post('/test-performance', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), archive_controller_1.archiveController.testPerformance);
// Get archive configuration (admin only)
router.get('/configuration', auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)(client_1.UserRole.ADMIN), archive_controller_1.archiveController.getConfiguration);
exports.default = router;
