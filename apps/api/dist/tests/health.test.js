"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
(0, vitest_1.describe)('Health and Middleware Tests', () => {
    (0, vitest_1.it)('GET /health returns 200 with correct shape', async () => {
        const response = await (0, supertest_1.default)(app_1.app).get('/health');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body).toHaveProperty('status', 'ok');
        (0, vitest_1.expect)(response.body).toHaveProperty('timestamp');
        (0, vitest_1.expect)(response.body).toHaveProperty('version');
    });
    (0, vitest_1.it)('Unknown route returns 404 with JSON error', async () => {
        const response = await (0, supertest_1.default)(app_1.app).get('/api/unknown-route');
        (0, vitest_1.expect)(response.status).toBe(404);
        (0, vitest_1.expect)(response.body).toEqual({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Endpoint not found',
            },
        });
    });
    (0, vitest_1.it)('Correlation ID header present in response', async () => {
        const response = await (0, supertest_1.default)(app_1.app).get('/health');
        (0, vitest_1.expect)(response.headers).toHaveProperty('x-correlation-id');
        (0, vitest_1.expect)(typeof response.headers['x-correlation-id']).toBe('string');
    });
});
