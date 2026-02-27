import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Health and Middleware Tests', () => {
    it('GET /health returns 200 with correct shape', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('version');
    });

    it('Unknown route returns 404 with JSON error', async () => {
        const response = await request(app).get('/api/unknown-route');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Endpoint not found',
            },
        });
    });

    it('Correlation ID header present in response', async () => {
        const response = await request(app).get('/health');

        expect(response.headers).toHaveProperty('x-correlation-id');
        expect(typeof response.headers['x-correlation-id']).toBe('string');
    });
});
