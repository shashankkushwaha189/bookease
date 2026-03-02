"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("./config/env");
const correlation_id_1 = require("./middleware/correlation-id");
const error_handler_1 = require("./middleware/error-handler");
const tenant_middleware_1 = require("./middleware/tenant.middleware");
const tenant_routes_1 = __importDefault(require("./modules/tenant/tenant.routes"));
const business_profile_routes_1 = __importDefault(require("./modules/business-profile/business-profile.routes"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const config_routes_1 = __importDefault(require("./modules/config/config.routes"));
const availability_routes_1 = __importDefault(require("./modules/availability/availability.routes"));
const service_routes_1 = __importDefault(require("./modules/service/service.routes"));
const staff_routes_1 = __importDefault(require("./modules/staff/staff.routes"));
const audit_routes_1 = __importDefault(require("./modules/audit/audit.routes"));
const appointment_routes_1 = require("./modules/appointment/appointment.routes");
const report_routes_1 = __importDefault(require("./modules/report/report.routes"));
const import_routes_1 = __importDefault(require("./modules/import/import.routes"));
const api_token_routes_1 = __importDefault(require("./modules/api-token/api-token.routes"));
const ai_routes_1 = require("./modules/ai/ai.routes");
const app = (0, express_1.default)();
exports.app = app;
// Security & Optimization
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: env_1.env.CORS_ORIGIN }));
app.use((0, compression_1.default)());
app.use(express_1.default.json());
// Request Tracking
app.use(correlation_id_1.correlationIdMiddleware);
// Rate Limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests, please try again later.',
        },
    },
});
app.use(limiter);
const prisma_1 = require("./lib/prisma"); // Added Prisma for DB probe
// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        db: 'ok',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
    });
});
// Readiness Probe
app.get('/ready', async (req, res) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        res.status(200).json({ status: 'ok', db: 'ok' });
    }
    catch (e) {
        res.status(503).json({ status: 'error', db: 'error', message: 'Database connection failed' });
    }
});
// Global Context (Tenant ID required for these)
const protectedRoutes = [
    '/api/business-profile',
    '/api/config',
    '/api/availability',
    '/api/services',
    '/api/staff',
    '/api/appointments',
    '/api/public/bookings',
    '/api/public/profile',
    '/api/public/services',
    '/api/public/staff',
    '/api/audit',
    '/api/auth',
    '/api/reports',
    '/api/import',
    '/api/tokens',
];
app.use(protectedRoutes, tenant_middleware_1.tenantMiddleware);
// API Routes
app.use('/api/tenants', tenant_routes_1.default);
app.use('/api/business-profile', business_profile_routes_1.default);
app.use('/api/public/profile', business_profile_routes_1.default);
app.use('/api/auth', auth_routes_1.default);
app.use('/api/config', config_routes_1.default);
app.use('/api/availability', availability_routes_1.default);
app.use('/api/services', service_routes_1.default);
app.use('/api/public/services', service_routes_1.default);
app.use('/api/staff', staff_routes_1.default);
app.use('/api/public/staff', staff_routes_1.default);
app.use('/api/appointments', appointment_routes_1.appointmentRouter);
app.use('/api/appointments', ai_routes_1.aiRoutes);
app.use('/api/public/bookings', appointment_routes_1.appointmentRouter);
app.use('/api/audit', audit_routes_1.default);
app.use('/api/reports', report_routes_1.default);
app.use('/api/import', import_routes_1.default);
app.use('/api/tokens', api_token_routes_1.default);
// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found',
        },
    });
});
// Error Handling (Must be last)
app.use(error_handler_1.errorHandler);
