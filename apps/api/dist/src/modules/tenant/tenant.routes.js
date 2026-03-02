"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tenant_controller_1 = require("./tenant.controller");
const tenant_service_1 = require("./tenant.service");
const tenant_repository_1 = require("./tenant.repository");
const validate_1 = require("../../middleware/validate");
const tenant_schema_1 = require("./tenant.schema");
const router = (0, express_1.Router)();
// DI - Manual for now, can use a container later
const repository = new tenant_repository_1.TenantRepository();
const service = new tenant_service_1.TenantService(repository);
const controller = new tenant_controller_1.TenantController(service);
router.post('/', (0, validate_1.validateBody)(tenant_schema_1.createTenantSchema), (req, res, next) => controller.create(req, res, next));
router.get('/', (req, res, next) => controller.list(req, res, next));
router.get('/:id', (req, res, next) => controller.getOne(req, res, next));
router.patch('/:id', (0, validate_1.validateBody)(tenant_schema_1.updateTenantSchema), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));
exports.default = router;
