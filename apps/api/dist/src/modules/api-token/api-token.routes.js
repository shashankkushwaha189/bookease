"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const api_token_controller_1 = require("./api-token.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const role_middleware_1 = require("../../middleware/role.middleware");
const router = (0, express_1.Router)();
// Tokens can only be generated explicitly by human admins logging into the dashboard
router.use(auth_middleware_1.authMiddleware);
router.use((0, role_middleware_1.requireRole)('ADMIN'));
router.post('/', api_token_controller_1.apiTokenController.create);
router.get('/', api_token_controller_1.apiTokenController.list);
router.delete('/:id', api_token_controller_1.apiTokenController.revoke);
exports.default = router;
