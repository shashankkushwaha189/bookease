"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoSeeder = void 0;
exports.seedDemoCommand = seedDemoCommand;
exports.resetDemoCommand = resetDemoCommand;
exports.statusDemoCommand = statusDemoCommand;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_2 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class DemoSeeder {
    static DEMO_TENANT = {
        name: 'HealthFirst Medical Center',
        slug: 'healthfirst-demo',
        timezone: 'America/New_York',
        aiEnabled: true,
        aiModel: 'gpt-3.5-turbo',
        aiMaxTokens: 1000,
        aiTemperature: 0.7,
        aiAutoGenerate: false,
        aiDataRetentionDays: 30,
        aiTimeoutMs: 30000,
        aiMaxRetries: 3,
    };
    static DEMO_USERS = [
        {
            email: 'admin@healthfirst.demo',
            password: 'demo123456',
            role: client_2.UserRole.ADMIN,
            firstName: 'Sarah',
            lastName: 'Johnson',
        },
        {
            email: 'dr.smith@healthfirst.demo',
            password: 'demo123456',
            role: client_2.UserRole.STAFF,
            firstName: 'Michael',
            lastName: 'Smith',
        },
        {
            email: 'dr.wilson@healthfirst.demo',
            password: 'demo123456',
            role: client_2.UserRole.STAFF,
            firstName: 'Emily',
            lastName: 'Wilson',
        },
        {
            email: 'receptionist@healthfirst.demo',
            password: 'demo123456',
            role: client_2.UserRole.USER,
            firstName: 'Jennifer',
            lastName: 'Brown',
        },
    ];
    static DEMO_SERVICES = [
        {
            name: 'General Consultation',
            description: 'Routine medical consultation and health assessment',
            durationMinutes: 30,
            bufferBefore: 5,
            bufferAfter: 5,
            price: 150,
            color: '#3B82F6',
            category: 'General',
            isActive: true,
        },
        {
            name: 'Annual Check-up',
            description: 'Comprehensive annual health examination',
            durationMinutes: 45,
            bufferBefore: 10,
            bufferAfter: 10,
            price: 250,
            color: '#10B981',
            category: 'Preventive',
            isActive: true,
        },
        {
            name: 'Specialist Consultation',
            description: 'Specialist medical consultation',
            durationMinutes: 60,
            bufferBefore: 15,
            bufferAfter: 15,
            price: 350,
            color: '#8B5CF6',
            category: 'Specialist',
            isActive: true,
        },
        {
            name: 'Vaccination',
            description: 'Routine vaccination and immunization',
            durationMinutes: 15,
            bufferBefore: 5,
            bufferAfter: 5,
            price: 50,
            color: '#F59E0B',
            category: 'Preventive',
            isActive: true,
        },
        {
            name: 'Minor Procedure',
            description: 'Minor medical procedures and treatments',
            durationMinutes: 90,
            bufferBefore: 15,
            bufferAfter: 15,
            price: 500,
            color: '#EF4444',
            category: 'Procedure',
            isActive: true,
        },
    ];
    static DEMO_STAFF = [
        {
            name: 'Dr. Michael Smith',
            email: 'dr.smith@healthfirst.demo',
            role: 'General Practitioner',
            specialization: 'Family Medicine',
            phone: '+1-555-0101',
            bio: 'Experienced family physician with 15+ years of practice',
            isActive: true,
        },
        {
            name: 'Dr. Emily Wilson',
            email: 'dr.wilson@healthfirst.demo',
            role: 'Specialist',
            specialization: 'Internal Medicine',
            phone: '+1-555-0102',
            bio: 'Internal medicine specialist focused on chronic disease management',
            isActive: true,
        },
        {
            name: 'Jennifer Brown',
            email: 'receptionist@healthfirst.demo',
            role: 'Receptionist',
            specialization: 'Front Desk',
            phone: '+1-555-0103',
            bio: 'Friendly and efficient front desk coordinator',
            isActive: true,
        },
    ];
    static DEMO_CUSTOMERS = [
        {
            name: 'John Anderson',
            email: 'john.anderson@email.com',
            phone: '+1-555-1001',
            dateOfBirth: '1985-05-15',
            address: '123 Main St, New York, NY 10001',
            emergencyContact: 'Mary Anderson, +1-555-1002',
            medicalHistory: 'No significant medical history',
            allergies: 'None known',
            bloodType: 'O+',
        },
        {
            name: 'Mary Johnson',
            email: 'mary.johnson@email.com',
            phone: '+1-555-1003',
            dateOfBirth: '1990-08-22',
            address: '456 Oak Ave, New York, NY 10002',
            emergencyContact: 'Robert Johnson, +1-555-1004',
            medicalHistory: 'Hypertension, controlled with medication',
            allergies: 'Penicillin',
            bloodType: 'A+',
        },
        {
            name: 'Robert Davis',
            email: 'robert.davis@email.com',
            phone: '+1-555-1005',
            dateOfBirth: '1978-03-10',
            address: '789 Pine St, New York, NY 10003',
            emergencyContact: 'Linda Davis, +1-555-1006',
            medicalHistory: 'Type 2 Diabetes',
            allergies: 'None',
            bloodType: 'B+',
        },
        {
            name: 'Linda Martinez',
            email: 'linda.martinez@email.com',
            phone: '+1-555-1007',
            dateOfBirth: '1992-11-28',
            address: '321 Elm St, New York, NY 10004',
            emergencyContact: 'Carlos Martinez, +1-555-1008',
            medicalHistory: 'Asthma',
            allergies: 'Pollen',
            bloodType: 'AB+',
        },
        {
            name: 'Carlos Garcia',
            email: 'carlos.garcia@email.com',
            phone: '+1-555-1009',
            dateOfBirth: '1988-07-12',
            address: '654 Maple Dr, New York, NY 10005',
            emergencyContact: 'Ana Garcia, +1-555-1010',
            medicalHistory: 'No significant medical history',
            allergies: 'Latex',
            bloodType: 'O-',
        },
    ];
    static DEMO_APPOINTMENTS = [
        {
            referenceId: 'BK-001',
            serviceIndex: 0, // General Consultation
            staffIndex: 0, // Dr. Smith
            customerIndex: 0, // John Anderson
            startTime: new Date('2024-01-15T09:00:00.000Z'),
            endTime: new Date('2024-01-15T09:30:00.000Z'),
            status: client_2.AppointmentStatus.COMPLETED,
            notes: 'Patient presented for routine check-up. Vital signs normal. Discussed lifestyle modifications.',
        },
        {
            referenceId: 'BK-002',
            serviceIndex: 1, // Annual Check-up
            staffIndex: 1, // Dr. Wilson
            customerIndex: 1, // Mary Johnson
            startTime: new Date('2024-01-15T10:30:00.000Z'),
            endTime: new Date('2024-01-15T11:15:00.000Z'),
            status: client_2.AppointmentStatus.COMPLETED,
            notes: 'Annual physical examination completed. Blood pressure controlled. Medication review performed.',
        },
        {
            referenceId: 'BK-003',
            serviceIndex: 2, // Specialist Consultation
            staffIndex: 1, // Dr. Wilson
            customerIndex: 2, // Robert Davis
            startTime: new Date('2024-01-15T14:00:00.000Z'),
            endTime: new Date('2024-01-15T15:00:00.000Z'),
            status: client_2.AppointmentStatus.COMPLETED,
            notes: 'Diabetes management consultation. A1c levels reviewed. Treatment plan adjusted.',
        },
        {
            referenceId: 'BK-004',
            serviceIndex: 3, // Vaccination
            staffIndex: 0, // Dr. Smith
            customerIndex: 3, // Linda Martinez
            startTime: new Date('2024-01-16T09:30:00.000Z'),
            endTime: new Date('2024-01-16T09:45:00.000Z'),
            status: client_2.AppointmentStatus.COMPLETED,
            notes: 'Annual flu vaccination administered. No adverse reactions observed.',
        },
        {
            referenceId: 'BK-005',
            serviceIndex: 0, // General Consultation
            staffIndex: 0, // Dr. Smith
            customerIndex: 4, // Carlos Garcia
            startTime: new Date('2024-01-16T10:15:00.000Z'),
            endTime: new Date('2024-01-16T10:45:00.000Z'),
            status: client_2.AppointmentStatus.COMPLETED,
            notes: 'Initial consultation for new patient. Medical history reviewed. Preventive care discussed.',
        },
        {
            referenceId: 'BK-006',
            serviceIndex: 1, // Annual Check-up
            staffIndex: 1, // Dr. Wilson
            customerIndex: 0, // John Anderson
            startTime: new Date('2024-01-17T11:00:00.000Z'),
            endTime: new Date('2024-01-17T11:45:00.000Z'),
            status: client_2.AppointmentStatus.BOOKED,
            notes: 'Scheduled annual check-up',
        },
        {
            referenceId: 'BK-007',
            serviceIndex: 0, // General Consultation
            staffIndex: 0, // Dr. Smith
            customerIndex: 1, // Mary Johnson
            startTime: new Date('2024-01-17T14:30:00.000Z'),
            endTime: new Date('2024-01-17T15:00:00.000Z'),
            status: client_2.AppointmentStatus.BOOKED,
            notes: 'Follow-up consultation',
        },
        {
            referenceId: 'BK-008',
            serviceIndex: 4, // Minor Procedure
            staffIndex: 1, // Dr. Wilson
            customerIndex: 2, // Robert Davis
            startTime: new Date('2024-01-18T09:00:00.000Z'),
            endTime: new Date('2024-01-18T10:30:00.000Z'),
            status: client_2.AppointmentStatus.CONFIRMED,
            notes: 'Minor procedure scheduled',
        },
    ];
    static DEMO_AI_SUMMARIES = [
        {
            appointmentIndex: 0, // BK-001
            summary: 'Patient John Anderson presented for routine check-up. Vital signs were within normal ranges including blood pressure 120/80, heart rate 72, and temperature 98.6°F. Patient reported feeling well with no acute concerns. Discussed importance of regular exercise and balanced diet. Recommended follow-up in 6 months for routine monitoring.',
            customerIntent: 'Routine health maintenance and preventive care check-up',
            followUpSuggestion: 'Schedule routine follow-up in 6 months or sooner if any symptoms develop',
            confidence: 0.92,
            keyPoints: [
                'Vital signs normal (BP 120/80, HR 72, Temp 98.6°F)',
                'No acute concerns reported',
                'Patient feeling well',
                'Lifestyle counseling provided',
                'Preventive care discussed'
            ],
            sentiment: {
                score: 0.6,
                label: 'positive',
                confidence: 0.88
            },
            processingTime: 1250,
        },
        {
            appointmentIndex: 1, // BK-002
            summary: 'Patient Mary Johnson completed annual physical examination. Blood pressure well controlled at 125/82 with current medication. A1c level improved to 6.8% from previous 7.2%. Medication review completed with no adjustments needed. Patient compliant with treatment plan. Discussed importance of continued medication adherence and lifestyle modifications.',
            customerIntent: 'Annual preventive health examination and chronic disease management review',
            followUpSuggestion: 'Continue current medication regimen, follow up in 3 months for diabetes monitoring',
            confidence: 0.95,
            keyPoints: [
                'Annual physical completed',
                'Blood pressure controlled (125/82)',
                'A1c improved to 6.8%',
                'Medication review completed',
                'Patient compliant with treatment'
            ],
            sentiment: {
                score: 0.7,
                label: 'positive',
                confidence: 0.91
            },
            processingTime: 1450,
        },
        {
            appointmentIndex: 2, // BK-003
            summary: 'Patient Robert Davis attended diabetes management consultation. Recent A1c level of 7.8% indicates suboptimal control. Current treatment regimen reviewed and adjusted. Patient educated on carbohydrate counting and glucose monitoring. Discussed importance of regular exercise and weight management. New medication prescribed to improve glycemic control.',
            customerIntent: 'Diabetes management consultation and treatment plan optimization',
            followUpSuggestion: 'Follow up in 4 weeks to assess response to new medication, continue glucose monitoring logs',
            confidence: 0.89,
            keyPoints: [
                'A1c level 7.8% (suboptimal)',
                'Treatment regimen adjusted',
                'Patient education provided',
                'New medication prescribed',
                'Lifestyle modifications discussed'
            ],
            sentiment: {
                score: 0.2,
                label: 'neutral',
                confidence: 0.85
            },
            processingTime: 1350,
        },
        {
            appointmentIndex: 3, // BK-004
            summary: 'Patient Linda Martinez received annual flu vaccination. Patient tolerated vaccination well with no immediate adverse reactions. Education provided about flu symptoms and when to seek medical attention. Patient advised to monitor for delayed reactions. Vaccination record updated. No contraindications identified.',
            customerIntent: 'Annual influenza vaccination for preventive care',
            followUpSuggestion: 'Monitor for delayed reactions, return for any concerning symptoms, continue routine preventive care',
            confidence: 0.94,
            keyPoints: [
                'Flu vaccination administered',
                'No immediate adverse reactions',
                'Patient education provided',
                'Vaccination record updated',
                'No contraindications identified'
            ],
            sentiment: {
                score: 0.5,
                label: 'neutral',
                confidence: 0.92
            },
            processingTime: 1100,
        },
        {
            appointmentIndex: 4, // BK-005
            summary: 'Patient Carlos Garcia attended initial consultation as new patient. Comprehensive medical history obtained. Patient reports generally good health with no significant past medical issues. Family history reviewed. Preventive care plan established including recommended screenings and vaccinations. Patient education provided about practice policies and emergency procedures.',
            customerIntent: 'Initial consultation for new patient establishing care relationship',
            followUpSuggestion: 'Schedule routine blood work and establish baseline health metrics, return in 2 weeks for follow-up',
            confidence: 0.87,
            keyPoints: [
                'New patient consultation',
                'Medical history obtained',
                'Family history reviewed',
                'Preventive care plan established',
                'Patient education provided'
            ],
            sentiment: {
                score: 0.4,
                label: 'neutral',
                confidence: 0.86
            },
            processingTime: 1300,
        },
    ];
    static async seedDemoData() {
        logger_1.logger.info('Starting demo data seeding...');
        try {
            // Clean existing demo data
            await this.cleanDemoData();
            // Create demo tenant
            const tenant = await prisma.tenant.create({
                data: this.DEMO_TENANT,
            });
            // Create demo users
            const users = [];
            for (const userData of this.DEMO_USERS) {
                const hashedPassword = await bcrypt_1.default.hash(userData.password, 12);
                const user = await prisma.user.create({
                    data: {
                        email: userData.email,
                        passwordHash: hashedPassword,
                        role: userData.role,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        tenantId: tenant.id,
                        isActive: true,
                    },
                });
                users.push({ ...user, plainPassword: userData.password });
            }
            // Create demo services
            const services = [];
            for (const serviceData of this.DEMO_SERVICES) {
                const service = await prisma.service.create({
                    data: {
                        ...serviceData,
                        tenantId: tenant.id,
                    },
                });
                services.push(service);
            }
            // Create demo staff
            const staff = [];
            for (const staffData of this.DEMO_STAFF) {
                const staffMember = await prisma.staff.create({
                    data: {
                        ...staffData,
                        tenantId: tenant.id,
                    },
                });
                staff.push(staffMember);
            }
            // Create demo customers
            const customers = [];
            for (const customerData of this.DEMO_CUSTOMERS) {
                const customer = await prisma.customer.create({
                    data: {
                        ...customerData,
                        tenantId: tenant.id,
                    },
                });
                customers.push(customer);
            }
            // Create demo appointments
            const appointments = [];
            for (const appointmentData of this.DEMO_APPOINTMENTS) {
                const appointment = await prisma.appointment.create({
                    data: {
                        referenceId: appointmentData.referenceId,
                        serviceId: services[appointmentData.serviceIndex].id,
                        staffId: staff[appointmentData.staffIndex].id,
                        customerId: customers[appointmentData.customerIndex].id,
                        startTimeUtc: appointmentData.startTime,
                        endTimeUtc: appointmentData.endTime,
                        status: appointmentData.status,
                        notes: appointmentData.notes,
                        tenantId: tenant.id,
                        createdBy: users[0].id,
                    },
                });
                appointments.push(appointment);
            }
            // Create demo AI summaries for completed appointments
            const aiSummaries = [];
            for (const summaryData of this.DEMO_AI_SUMMARIES) {
                const appointment = appointments[summaryData.appointmentIndex];
                if (appointment.status === client_2.AppointmentStatus.COMPLETED) {
                    const aiSummary = await prisma.aISummary.create({
                        data: {
                            appointmentId: appointment.id,
                            tenantId: tenant.id,
                            summary: summaryData.summary,
                            customerIntent: summaryData.customerIntent,
                            followUpSuggestion: summaryData.followUpSuggestion,
                            confidence: summaryData.confidence,
                            keyPoints: summaryData.keyPoints,
                            sentimentScore: summaryData.sentiment?.score,
                            sentimentLabel: summaryData.sentiment?.label,
                            sentimentConfidence: summaryData.sentiment?.confidence,
                            model: this.DEMO_TENANT.aiModel,
                            processingTime: summaryData.processingTime,
                            accepted: true,
                        },
                    });
                    aiSummaries.push(aiSummary);
                }
            }
            const seedData = {
                tenant,
                users,
                services,
                staff,
                customers,
                appointments,
                aiSummaries,
            };
            logger_1.logger.info('Demo data seeding completed successfully', {
                tenantId: tenant.id,
                usersCount: users.length,
                servicesCount: services.length,
                staffCount: staff.length,
                customersCount: customers.length,
                appointmentsCount: appointments.length,
                aiSummariesCount: aiSummaries.length,
            });
            return seedData;
        }
        catch (error) {
            logger_1.logger.error('Failed to seed demo data', { error });
            throw error;
        }
    }
    static async cleanDemoData() {
        logger_1.logger.info('Cleaning existing demo data...');
        try {
            // Delete in order of dependencies
            await prisma.aISummary.deleteMany({
                where: {
                    tenant: {
                        slug: this.DEMO_TENANT.slug,
                    },
                },
            });
            await prisma.appointmentTimeline.deleteMany({
                where: {
                    appointment: {
                        tenant: {
                            slug: this.DEMO_TENANT.slug,
                        },
                    },
                },
            });
            await prisma.appointment.deleteMany({
                where: {
                    tenant: {
                        slug: this.DEMO_TENANT.slug,
                    },
                },
            });
            await prisma.customer.deleteMany({
                where: {
                    tenant: {
                        slug: this.DEMO_TENANT.slug,
                    },
                },
            });
            await prisma.staff.deleteMany({
                where: {
                    tenant: {
                        slug: this.DEMO_TENANT.slug,
                    },
                },
            });
            await prisma.service.deleteMany({
                where: {
                    tenant: {
                        slug: this.DEMO_TENANT.slug,
                    },
                },
            });
            await prisma.user.deleteMany({
                where: {
                    tenant: {
                        slug: this.DEMO_TENANT.slug,
                    },
                },
            });
            await prisma.tenant.deleteMany({
                where: {
                    slug: this.DEMO_TENANT.slug,
                },
            });
            logger_1.logger.info('Demo data cleaned successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to clean demo data', { error });
            throw error;
        }
    }
    static async resetDemoData() {
        logger_1.logger.info('Resetting demo data...');
        try {
            await this.cleanDemoData();
            return await this.seedDemoData();
        }
        catch (error) {
            logger_1.logger.error('Failed to reset demo data', { error });
            throw error;
        }
    }
    static async getDemoDataStatus() {
        try {
            const tenant = await prisma.tenant.findUnique({
                where: { slug: this.DEMO_TENANT.slug },
            });
            if (!tenant) {
                return { exists: false, counts: { users: 0, services: 0, staff: 0, customers: 0, appointments: 0, aiSummaries: 0 } };
            }
            const [usersCount, servicesCount, staffCount, customersCount, appointmentsCount, aiSummariesCount,] = await Promise.all([
                prisma.user.count({ where: { tenantId: tenant.id } }),
                prisma.service.count({ where: { tenantId: tenant.id } }),
                prisma.staff.count({ where: { tenantId: tenant.id } }),
                prisma.customer.count({ where: { tenantId: tenant.id } }),
                prisma.appointment.count({ where: { tenantId: tenant.id } }),
                prisma.aISummary.count({ where: { tenantId: tenant.id } }),
            ]);
            return {
                exists: true,
                tenant,
                counts: {
                    users: usersCount,
                    services: servicesCount,
                    staff: staffCount,
                    customers: customersCount,
                    appointments: appointmentsCount,
                    aiSummaries: aiSummariesCount,
                },
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get demo data status', { error });
            throw error;
        }
    }
    static async verifyDemoData() {
        const issues = [];
        const summary = {
            tenant: false,
            users: false,
            services: false,
            staff: false,
            customers: false,
            appointments: false,
            aiSummaries: false,
        };
        try {
            const status = await this.getDemoDataStatus();
            if (!status.exists) {
                issues.push('Demo tenant does not exist');
                return { valid: false, issues, summary };
            }
            // Verify tenant
            if (status.tenant && status.tenant.name === this.DEMO_TENANT.name) {
                summary.tenant = true;
            }
            else {
                issues.push('Demo tenant configuration mismatch');
            }
            // Verify minimum required data
            const minCounts = {
                users: 3,
                services: 3,
                staff: 2,
                customers: 3,
                appointments: 5,
                aiSummaries: 3,
            };
            if (status.counts.users >= minCounts.users) {
                summary.users = true;
            }
            else {
                issues.push(`Insufficient users: ${status.counts.users}/${minCounts.users}`);
            }
            if (status.counts.services >= minCounts.services) {
                summary.services = true;
            }
            else {
                issues.push(`Insufficient services: ${status.counts.services}/${minCounts.services}`);
            }
            if (status.counts.staff >= minCounts.staff) {
                summary.staff = true;
            }
            else {
                issues.push(`Insufficient staff: ${status.counts.staff}/${minCounts.staff}`);
            }
            if (status.counts.customers >= minCounts.customers) {
                summary.customers = true;
            }
            else {
                issues.push(`Insufficient customers: ${status.counts.customers}/${minCounts.customers}`);
            }
            if (status.counts.appointments >= minCounts.appointments) {
                summary.appointments = true;
            }
            else {
                issues.push(`Insufficient appointments: ${status.counts.appointments}/${minCounts.appointments}`);
            }
            if (status.counts.aiSummaries >= minCounts.aiSummaries) {
                summary.aiSummaries = true;
            }
            else {
                issues.push(`Insufficient AI summaries: ${status.counts.aiSummaries}/${minCounts.aiSummaries}`);
            }
            const allValid = Object.values(summary).every(Boolean);
            logger_1.logger.info('Demo data verification completed', {
                valid: allValid,
                issues: issues.length,
                summary,
            });
            return { valid: allValid, issues, summary };
        }
        catch (error) {
            logger_1.logger.error('Failed to verify demo data', { error });
            issues.push('Verification failed due to error');
            return { valid: false, issues, summary };
        }
    }
}
exports.DemoSeeder = DemoSeeder;
// CLI command functions
async function seedDemoCommand() {
    try {
        console.log('🌱 Seeding demo data...');
        const data = await DemoSeeder.seedDemoData();
        console.log('✅ Demo data seeded successfully!');
        console.log(`📊 Summary:`);
        console.log(`   Tenant: ${data.tenant.name} (${data.tenant.slug})`);
        console.log(`   Users: ${data.users.length}`);
        console.log(`   Services: ${data.services.length}`);
        console.log(`   Staff: ${data.staff.length}`);
        console.log(`   Customers: ${data.customers.length}`);
        console.log(`   Appointments: ${data.appointments.length}`);
        console.log(`   AI Summaries: ${data.aiSummaries.length}`);
        console.log('\n🔑 Demo Credentials:');
        data.users.forEach(user => {
            console.log(`   ${user.email}: ${user.plainPassword} (${user.role})`);
        });
        console.log('\n🚀 Demo is ready to use!');
    }
    catch (error) {
        console.error('❌ Failed to seed demo data:', error);
        process.exit(1);
    }
}
async function resetDemoCommand() {
    try {
        console.log('🔄 Resetting demo data...');
        const data = await DemoSeeder.resetDemoData();
        console.log('✅ Demo data reset successfully!');
        console.log(`📊 Summary:`);
        console.log(`   Tenant: ${data.tenant.name} (${data.tenant.slug})`);
        console.log(`   Users: ${data.users.length}`);
        console.log(`   Services: ${data.services.length}`);
        console.log(`   Staff: ${data.staff.length}`);
        console.log(`   Customers: ${data.customers.length}`);
        console.log(`   Appointments: ${data.appointments.length}`);
        console.log(`   AI Summaries: ${data.aiSummaries.length}`);
        console.log('\n🔑 Demo Credentials:');
        data.users.forEach(user => {
            console.log(`   ${user.email}: ${user.plainPassword} (${user.role})`);
        });
        console.log('\n🚀 Demo is ready to use!');
    }
    catch (error) {
        console.error('❌ Failed to reset demo data:', error);
        process.exit(1);
    }
}
async function statusDemoCommand() {
    try {
        console.log('📊 Checking demo data status...');
        const status = await DemoSeeder.getDemoDataStatus();
        const verification = await DemoSeeder.verifyDemoData();
        if (!status.exists) {
            console.log('❌ Demo data does not exist');
            console.log('💡 Run "npm run demo:seed" to create demo data');
            return;
        }
        console.log('✅ Demo data exists');
        console.log(`📊 Current status:`);
        console.log(`   Tenant: ${status.tenant?.name} (${status.tenant?.slug})`);
        console.log(`   Users: ${status.counts.users}`);
        console.log(`   Services: ${status.counts.services}`);
        console.log(`   Staff: ${status.counts.staff}`);
        console.log(`   Customers: ${status.counts.customers}`);
        console.log(`   Appointments: ${status.counts.appointments}`);
        console.log(`   AI Summaries: ${status.counts.aiSummaries}`);
        console.log('\n🔍 Verification results:');
        console.log(`   Overall: ${verification.valid ? '✅ Valid' : '❌ Invalid'}`);
        if (verification.issues.length > 0) {
            console.log('   Issues:');
            verification.issues.forEach(issue => {
                console.log(`     - ${issue}`);
            });
        }
        console.log('\n📋 Component status:');
        Object.entries(verification.summary).forEach(([component, valid]) => {
            console.log(`   ${component}: ${valid ? '✅' : '❌'}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to check demo status:', error);
        process.exit(1);
    }
}
// Run commands if called directly
if (require.main === module) {
    const command = process.argv[2];
    switch (command) {
        case 'seed':
            seedDemoCommand();
            break;
        case 'reset':
            resetDemoCommand();
            break;
        case 'status':
            statusDemoCommand();
            break;
        default:
            console.log('Usage: npm run demo [seed|reset|status]');
            console.log('  seed  - Create demo data');
            console.log('  reset - Reset demo data');
            console.log('  status - Check demo data status');
            process.exit(1);
    }
}
