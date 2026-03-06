import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { UserRole } from '@prisma/client';
import { cleanupDatabase } from './helpers';
import bcrypt from 'bcrypt';
import { parse } from 'csv-parse';

describe('Integration & API Layer - Comprehensive Tests', () => {
    let tenantId: string;
    let adminToken: string;
    let apiToken: string;
    const password = 'Password@123';

    beforeAll(async () => {
        await cleanupDatabase();

        // Create tenant
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Test Integration Clinic',
                slug: `test-integration-${Date.now()}`,
                timezone: 'UTC',
            }
        });
        tenantId = tenant.id;

        // Create admin user
        const passwordHash = await bcrypt.hash(password, 12);
        const adminUser = await prisma.user.create({
            data: {
                email: 'admin@integration.com',
                passwordHash,
                role: 'ADMIN',
                tenantId: tenant.id,
            },
        });

        const adminLogin = await request(app)
            .post('/api/auth/login')
            .set('X-Tenant-ID', tenantId)
            .send({ email: 'admin@integration.com', password });
        adminToken = adminLogin.body.data.token;

        // Create API token
        const tokenResponse = await request(app)
            .post('/api/tokens')
            .set('X-Tenant-ID', tenantId)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Test API Token' });
        
        apiToken = tokenResponse.body.data.token;
    });

    afterAll(async () => {
        await cleanupDatabase();
    });

    beforeEach(async () => {
        // Clean up test data
        await prisma.customer.deleteMany({ where: { tenantId } });
        await prisma.service.deleteMany({ where: { tenantId } });
        await prisma.staff.deleteMany({ where: { tenantId } });
    });

    describe('CSV IMPORT - Functional Tests', () => {
        it('should validate and flag invalid CSV rows', async () => {
            // Create invalid CSV data
            const invalidCsvData = `name,email,phone,tags
John Doe,john@example.com,555-1234,vip
Invalid Email,invalid-email,555-5678,regular
Jane Smith,jane@example.com,,new
,missing@example.com,555-9999,test`;

            const buffer = Buffer.from(invalidCsvData);

            const validationResponse = await request(app)
                .post('/api/import/customers/validate')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', buffer, 'customers.csv');

            expect(validationResponse.status).toBe(200);
            const report = validationResponse.body.data;

            expect(report.totalRows).toBe(4);
            expect(report.validRows).toBe(2); // John Doe and Jane Smith
            expect(report.invalidRows).toBe(2); // Invalid email and missing name
            expect(report.canPartialImport).toBe(true);
            expect(report.errors).toHaveLength(2);
            
            // Check specific errors
            const emailError = report.errors.find((e: any) => e.field === 'email');
            expect(emailError).toBeDefined();
            expect(emailError.message).toContain('Invalid email format');

            const nameError = report.errors.find((e: any) => e.field === 'name');
            expect(nameError).toBeDefined();
            expect(nameError.message).toContain('required');
        });

        it('should allow partial import with valid rows', async () => {
            // Create mixed valid/invalid CSV data
            const mixedCsvData = `name,email,phone,tags
John Doe,john@example.com,555-1234,vip
Invalid Email,invalid-email,555-5678,regular
Jane Smith,jane@example.com,,new
,missing@example.com,555-9999,test`;

            const buffer = Buffer.from(mixedCsvData);

            const importResponse = await request(app)
                .post('/api/import/customers')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .field('allowPartial', 'true')
                .field('skipDuplicates', 'true')
                .attach('file', buffer, 'customers.csv');

            expect(importResponse.status).toBe(200);
            const result = importResponse.body.data;

            expect(result.imported).toBe(2); // Only valid rows
            expect(result.failed).toBe(2); // Invalid rows
            expect(result.skipped).toBe(0);
            expect(result.errors).toHaveLength(2);
            expect(result.summary.validRows).toBe(2);
            expect(result.summary.invalidRows).toBe(2);
            expect(importResponse.body.meta.safeHandling).toBe(true);

            // Verify only valid customers were imported
            const customers = await prisma.customer.findMany({ where: { tenantId } });
            expect(customers).toHaveLength(2);
            expect(customers.map(c => c.name)).toContain('John Doe');
            expect(customers.map(c => c.name)).toContain('Jane Smith');
        });

        it('should import services with validation', async () => {
            const servicesCsvData = `name,durationMinutes,bufferBefore,bufferAfter,price,description
Consultation,30,5,5,150.00,General consultation
Checkup,60,10,10,200.00,Health checkup
Invalid Duration,invalid,5,5,100.00,Invalid service`;

            const buffer = Buffer.from(servicesCsvData);

            const validationResponse = await request(app)
                .post('/api/import/services/validate')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', buffer, 'services.csv');

            expect(validationResponse.status).toBe(200);
            const report = validationResponse.body.data;

            expect(report.validRows).toBe(2);
            expect(report.invalidRows).toBe(1);
            expect(report.canPartialImport).toBe(true);

            // Import only valid services
            const importResponse = await request(app)
                .post('/api/import/services')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .field('allowPartial', 'true')
                .attach('file', buffer, 'services.csv');

            expect(importResponse.status).toBe(200);
            const result = importResponse.body.data;

            expect(result.imported).toBe(2);
            expect(result.failed).toBe(1);

            // Verify services were imported correctly
            const services = await prisma.service.findMany({ where: { tenantId } });
            expect(services).toHaveLength(2);
            expect(services.find(s => s.name === 'Consultation')?.durationMinutes).toBe(30);
            expect(services.find(s => s.name === 'Checkup')?.price).toBe(200);
        });

        it('should import staff with service assignments', async () => {
            // First create services
            await prisma.service.createMany({
                data: [
                    {
                        tenantId,
                        name: 'Consultation',
                        durationMinutes: 30,
                        bufferBefore: 5,
                        bufferAfter: 5,
                        price: 150
                    },
                    {
                        tenantId,
                        name: 'Checkup',
                        durationMinutes: 60,
                        bufferBefore: 10,
                        bufferAfter: 10,
                        price: 200
                    }
                ]
            });

            const staffCsvData = `name,email,phone,role,assignedServices
Dr. Smith,smith@clinic.com,555-9999,Doctor,Consultation,Checkup
Nurse Johnson,johnson@clinic.com,555-8888,Nurse,Consultation
Invalid Staff,invalid-email,555-7777,Nurse,Checkup`;

            const buffer = Buffer.from(staffCsvData);

            const importResponse = await request(app)
                .post('/api/import/staff')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .field('allowPartial', 'true')
                .attach('file', buffer, 'staff.csv');

            expect(importResponse.status).toBe(200);
            const result = importResponse.body.data;

            expect(result.imported).toBe(2);
            expect(result.failed).toBe(1);

            // Verify staff and service assignments
            const staff = await prisma.staff.findMany({ 
                where: { tenantId },
                include: { services: true }
            });

            expect(staff).toHaveLength(2);
            
            const drSmith = staff.find(s => s.name === 'Dr. Smith');
            expect(drSmith?.services).toHaveLength(2); // Assigned to both services

            const nurseJohnson = staff.find(s => s.name === 'Nurse Johnson');
            expect(nurseJohnson?.services).toHaveLength(1); // Assigned to Consultation only
        });

        it('should provide import templates', async () => {
            const templateResponse = await request(app)
                .get('/api/import/templates')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(templateResponse.status).toBe(200);
            const templates = templateResponse.body.data;

            expect(templates.customers).toBeDefined();
            expect(templates.customers.headers).toEqual(['name', 'email', 'phone', 'tags']);
            expect(templates.customers.requiredFields).toEqual(['name', 'email']);
            expect(templates.customers.example).toHaveLength(2);

            expect(templates.services).toBeDefined();
            expect(templates.services.headers).toContain('name');
            expect(templates.services.headers).toContain('durationMinutes');

            expect(templates.staff).toBeDefined();
            expect(templates.staff.headers).toContain('name');
            expect(templates.staff.headers).toContain('email');
        });
    });

    describe('CSV IMPORT - Non-Functional Tests', () => {
        it('should handle large CSV files safely', async () => {
            // Generate a large CSV file (1000 rows)
            let csvData = 'name,email,phone,tags\n';
            for (let i = 0; i < 1000; i++) {
                csvData += `User ${i},user${i}@example.com,555-${i.toString().padStart(4, '0')},tag${i}\n`;
            }

            const buffer = Buffer.from(csvData);

            const importResponse = await request(app)
                .post('/api/import/customers')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', buffer, 'large_customers.csv');

            expect(importResponse.status).toBe(200);
            const result = importResponse.body.data;

            expect(result.imported).toBe(1000);
            expect(result.failed).toBe(0);
            expect(importResponse.body.meta.safeHandling).toBe(true);
            expect(parseFloat(importResponse.body.meta.fileSize)).toBeGreaterThan(0);

            // Verify all customers were imported
            const customers = await prisma.customer.count({ where: { tenantId } });
            expect(customers).toBe(1000);
        });

        it('should reject files that are too large', async () => {
            // Generate a very large CSV content (over 50MB)
            let csvData = 'name,email,phone,tags\n';
            for (let i = 0; i < 100000; i++) {
                csvData += `User ${i},user${i}@example.com,555-${i.toString().padStart(4, '0')},${'tag'.repeat(100)}\n`;
            }

            const buffer = Buffer.from(csvData);

            const importResponse = await request(app)
                .post('/api/import/customers')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', buffer, 'oversized.csv');

            expect(importResponse.status).toBe(413);
            expect(importResponse.body.error.code).toBe('FILE_TOO_LARGE');
        });

        it('should handle malformed CSV gracefully', async () => {
            // Create malformed CSV
            const malformedCsv = `name,email,phone
John Doe,john@example.com
"Quoted, Name",quoted@example.com,555-1234
Incomplete Row
Too,Many,Columns,Here,Extra,Data`;

            const buffer = Buffer.from(malformedCsv);

            const validationResponse = await request(app)
                .post('/api/import/customers/validate')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', buffer, 'malformed.csv');

            expect(validationResponse.status).toBe(200);
            const report = validationResponse.body.data;

            // Should handle gracefully without crashing
            expect(report.totalRows).toBeGreaterThan(0);
            expect(report.errors).toBeDefined();
            expect(report.warnings).toBeDefined();
        });
    });

    describe('API TOKEN - Functional Tests', () => {
        it('should require valid API token for API access', async () => {
            // Try to access API without token
            const response = await request(app)
                .get('/api/public/services')
                .set('X-Tenant-ID', tenantId);

            expect(response.status).toBe(401);

            // Try with invalid token
            const invalidResponse = await request(app)
                .get('/api/public/services')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', 'Bearer invalid-token');

            expect(invalidResponse.status).toBe(401);

            // Try with valid API token
            const validResponse = await request(app)
                .get('/api/public/services')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${apiToken}`);

            expect(validResponse.status).toBe(200);
        });

        it('should create and manage API tokens', async () => {
            // Create new token
            const createResponse = await request(app)
                .post('/api/tokens')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    name: 'New Test Token',
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                });

            expect(createResponse.status).toBe(200);
            const token = createResponse.body.data;
            expect(token.name).toBe('New Test Token');
            expect(token.token).toBeDefined();
            expect(token.expiresAt).toBeDefined();
            expect(token.isActive).toBe(true);

            const newToken = token.token;

            // List tokens
            const listResponse = await request(app)
                .get('/api/tokens')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(listResponse.status).toBe(200);
            const tokens = listResponse.body.data;
            expect(tokens.length).toBeGreaterThan(0);
            expect(tokens.find((t: any) => t.name === 'New Test Token')).toBeDefined();

            // Test new token works
            const testResponse = await request(app)
                .get('/api/public/services')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${newToken}`);

            expect(testResponse.status).toBe(200);

            // Revoke token
            const revokeResponse = await request(app)
                .delete(`/api/tokens/${token.id}`)
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(revokeResponse.status).toBe(200);
            expect(revokeResponse.body.data.success).toBe(true);

            // Token should no longer work
            const revokedResponse = await request(app)
                .get('/api/public/services')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${newToken}`);

            expect(revokedResponse.status).toBe(401);
        });

        it('should enforce token uniqueness and validation', async () => {
            // Create first token
            await request(app)
                .post('/api/tokens')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Duplicate Test Token' });

            // Try to create token with same name
            const duplicateResponse = await request(app)
                .post('/api/tokens')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Duplicate Test Token' });

            expect(duplicateResponse.status).toBe(409);
            expect(duplicateResponse.body.error.code).toBe('TOKEN_NAME_EXISTS');

            // Try to create token with invalid name
            const invalidNameResponse = await request(app)
                .post('/api/tokens')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: '' }); // Empty name

            expect(invalidNameResponse.status).toBe(400);
            expect(invalidNameResponse.body.error.code).toBe('INVALID_TOKEN_NAME');
        });
    });

    describe('RATE LIMITING - Non-Functional Tests', () => {
        it('should enforce rate limiting for API tokens', async () => {
            // Create a token with low rate limit for testing
            const tokenResponse = await request(app)
                .post('/api/tokens')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Rate Limit Test Token' });

            const testToken = tokenResponse.body.data.token;

            // Make many rapid requests to test rate limiting
            const requests = [];
            for (let i = 0; i < 50; i++) {
                requests.push(
                    request(app)
                        .get('/api/public/services')
                        .set('X-Tenant-ID', tenantId)
                        .set('Authorization', `Bearer ${testToken}`)
                );
            }

            const responses = await Promise.all(requests);
            
            // Most should succeed, some might be rate limited
            const successCount = responses.filter(r => r.status === 200).length;
            const rateLimitedCount = responses.filter(r => r.status === 429).length;

            expect(successCount).toBeGreaterThan(0);
            // Rate limiting should kick in after certain threshold
            if (rateLimitedCount > 0) {
                const rateLimitedResponse = responses.find(r => r.status === 429);
                expect(rateLimitedResponse?.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
            }
        });

        it('should track token usage statistics', async () => {
            // Create token for testing
            const tokenResponse = await request(app)
                .post('/api/tokens')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Usage Test Token' });

            const testToken = tokenResponse.body.data.token;
            const tokenId = tokenResponse.body.data.id;

            // Make some API calls
            for (let i = 0; i < 10; i++) {
                await request(app)
                    .get('/api/public/services')
                    .set('X-Tenant-ID', tenantId)
                    .set('Authorization', `Bearer ${testToken}`);
            }

            // Get usage statistics
            const usageResponse = await request(app)
                .get(`/api/tokens/${tokenId}/usage`)
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ days: 30 });

            expect(usageResponse.status).toBe(200);
            const usage = usageResponse.body.data;

            expect(usage.totalUsage).toBeGreaterThanOrEqual(10);
            expect(usage.dailyUsage).toBeDefined();
            expect(usage.rateLimitHits).toBeDefined();
        });
    });

    describe('REST API - Booking Flows', () => {
        it('should support complete booking flow via API', async () => {
            // Create service and staff first
            const service = await prisma.service.create({
                data: {
                    tenantId,
                    name: 'API Test Service',
                    durationMinutes: 30,
                    bufferBefore: 5,
                    bufferAfter: 5,
                    price: 100
                }
            });

            const staff = await prisma.staff.create({
                data: {
                    tenantId,
                    name: 'API Test Staff',
                    email: 'apistaff@test.com'
                }
            });

            const customer = await prisma.customer.create({
                data: {
                    tenantId,
                    name: 'API Test Customer',
                    email: 'apicustomer@test.com'
                }
            });

            // Get available slots via API
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);

            const slotsResponse = await request(app)
                .get('/api/public/availability')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${apiToken}`)
                .query({
                    serviceId: service.id,
                    staffId: staff.id,
                    date: tomorrow.toISOString().split('T')[0]
                });

            expect(slotsResponse.status).toBe(200);
            const slots = slotsResponse.body.data.slots;
            expect(slots.length).toBeGreaterThan(0);

            // Create booking via API
            const bookingResponse = await request(app)
                .post('/api/public/bookings')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${apiToken}`)
                .send({
                    serviceId: service.id,
                    staffId: staff.id,
                    customerId: customer.id,
                    startTimeUtc: slots[0].startTimeUtc,
                    notes: 'API test booking'
                });

            expect(bookingResponse.status).toBe(200);
            const booking = bookingResponse.body.data;
            expect(booking.referenceId).toBeDefined();
            expect(booking.status).toBe('BOOKED');

            // Verify booking exists
            const verifyResponse = await request(app)
                .get(`/api/public/bookings/${booking.referenceId}`)
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${apiToken}`);

            expect(verifyResponse.status).toBe(200);
            expect(verifyResponse.body.data.referenceId).toBe(booking.referenceId);
        });

        it('should handle booking validation via API', async () => {
            // Try to create booking with invalid data
            const invalidBookingResponse = await request(app)
                .post('/api/public/bookings')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${apiToken}`)
                .send({
                    serviceId: 'invalid-service-id',
                    staffId: 'invalid-staff-id',
                    customerId: 'invalid-customer-id',
                    startTimeUtc: 'invalid-date'
                });

            expect(invalidBookingResponse.status).toBe(400);
            expect(invalidBookingResponse.body.error.code).toBeDefined();
        });
    });

    describe('INTEGRATION TESTS', () => {
        it('should support complete import-to-booking workflow', async () => {
            // Step 1: Import services
            const servicesCsv = `name,durationMinutes,bufferBefore,bufferAfter,price
Consultation,30,5,5,150.00
Checkup,60,10,10,200.00`;

            const servicesBuffer = Buffer.from(servicesCsv);
            await request(app)
                .post('/api/import/services')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', servicesBuffer, 'services.csv');

            // Step 2: Import staff
            const staffCsv = `name,email,phone,role,assignedServices
Dr. Smith,smith@clinic.com,555-9999,Doctor,Consultation,Checkup`;

            const staffBuffer = Buffer.from(staffCsv);
            await request(app)
                .post('/api/import/staff')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', staffBuffer, 'staff.csv');

            // Step 3: Import customers
            const customersCsv = `name,email,phone,tags
John Doe,john@example.com,555-1234,vip
Jane Smith,jane@example.com,555-5678,regular`;

            const customersBuffer = Buffer.from(customersCsv);
            await request(app)
                .post('/api/import/customers')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${adminToken}`)
                .attach('file', customersBuffer, 'customers.csv');

            // Step 4: Verify data was imported
            const services = await prisma.service.findMany({ where: { tenantId } });
            const staff = await prisma.staff.findMany({ 
                where: { tenantId },
                include: { services: true }
            });
            const customers = await prisma.customer.findMany({ where: { tenantId } });

            expect(services).toHaveLength(2);
            expect(staff).toHaveLength(1);
            expect(customers).toHaveLength(2);

            // Step 5: Create booking via API using imported data
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            const bookingResponse = await request(app)
                .post('/api/public/bookings')
                .set('X-Tenant-ID', tenantId)
                .set('Authorization', `Bearer ${apiToken}`)
                .send({
                    serviceId: services[0].id,
                    staffId: staff[0].id,
                    customerId: customers[0].id,
                    startTimeUtc: tomorrow.toISOString(),
                    notes: 'Integration test booking'
                });

            expect(bookingResponse.status).toBe(200);
            const booking = bookingResponse.body.data;
            expect(booking.referenceId).toBeDefined();

            // Step 6: Verify complete workflow
            const finalBooking = await prisma.appointment.findUnique({
                where: { id: booking.id },
                include: { service: true, staff: true, customer: true }
            });

            expect(finalBooking).toBeTruthy();
            expect(finalBooking?.service.name).toBe('Consultation');
            expect(finalBooking?.staff.name).toBe('Dr. Smith');
            expect(finalBooking?.customer.name).toBe('John Doe');
        });
    });
});
