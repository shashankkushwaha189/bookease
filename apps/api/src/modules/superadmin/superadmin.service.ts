import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

export class SuperAdminService {
    // Get all tenants (super admin functionality)
    async getAllTenants() {
        const tenants = await prisma.tenant.findMany({
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        isActive: true
                    }
                }
            }
        });

        return tenants.map(tenant => ({
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            domain: tenant.domain,
            timezone: tenant.timezone,
            isActive: tenant.isActive,
            createdAt: tenant.createdAt,
            userCount: tenant.users?.length || 0
        }));
    }

    // Create new tenant
    async createTenant(data: any) {
        const { name, slug, domain, timezone, adminEmail, adminPassword } = data;

        // Check if tenant slug already exists
        const existingTenant = await prisma.tenant.findUnique({
            where: { slug }
        });

        if (existingTenant) {
            throw new AppError('Tenant with this slug already exists', 409, 'TENANT_EXISTS');
        }

        // Create tenant
        const newTenant = await prisma.tenant.create({
            data: {
                name,
                slug,
                domain,
                timezone: timezone || 'UTC',
                isActive: true
            }
        });

        // Create admin user for the tenant
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        const adminUser = await prisma.user.create({
            data: {
                tenantId: newTenant.id,
                email: adminEmail,
                passwordHash,
                role: UserRole.ADMIN,
                isActive: true
            }
        });

        return {
            id: newTenant.id,
            name: newTenant.name,
            slug: newTenant.slug,
            domain: newTenant.domain,
            timezone: newTenant.timezone,
            isActive: newTenant.isActive,
            createdAt: newTenant.createdAt,
            admin: {
                id: adminUser.id,
                email: adminUser.email,
                role: adminUser.role
            }
        };
    }

    // Update tenant
    async updateTenant(id: string, data: any) {
        const { name, domain, timezone, isActive } = data;

        const updatedTenant = await prisma.tenant.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(domain && { domain }),
                ...(timezone && { timezone }),
                ...(isActive !== undefined && { isActive })
            }
        });

        return updatedTenant;
    }

    // Delete tenant
    async deleteTenant(id: string) {
        // Check if tenant exists
        const tenant = await prisma.tenant.findUnique({
            where: { id }
        });

        if (!tenant) {
            throw new AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
        }

        // Soft delete tenant
        await prisma.tenant.update({
            where: { id },
            data: {
                isActive: false,
                deletedAt: new Date()
            }
        });
    }

    // Add staff to any tenant
    async addStaffToTenant(tenantId: string, data: any) {
        const { name, email, password, role = UserRole.STAFF, phone, department, title } = data;

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                tenantId,
                email
            }
        });

        if (existingUser) {
            throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create staff user
        const newStaff = await prisma.user.create({
            data: {
                tenantId,
                email,
                passwordHash,
                role,
                isActive: true
            }
        });

        // Create staff record
        const staffRecord = await prisma.staff.create({
            data: {
                tenantId,
                userId: newStaff.id,
                email,
                department,
                title,
                isActive: true
            }
        });

        return {
            user: {
                id: newStaff.id,
                email: newStaff.email,
                role: newStaff.role,
                tenantId: newStaff.tenantId
            },
            staff: {
                id: staffRecord.id,
                email: staffRecord.email,
                department: staffRecord.department,
                title: staffRecord.title
            }
        };
    }

    // Add customer to any tenant
    async addCustomerToTenant(tenantId: string, data: any) {
        const { name, email, phone, address, dateOfBirth, gender } = data;

        // Check if customer already exists
        const existingCustomer = await prisma.customer.findFirst({
            where: {
                tenantId,
                email
            }
        });

        if (existingCustomer) {
            throw new AppError('Customer with this email already exists', 409, 'CUSTOMER_EXISTS');
        }

        // Create customer
        const newCustomer = await prisma.customer.create({
            data: {
                tenantId,
                name,
                email,
                phone,
                address: address ? JSON.stringify(address) : null,
                dateOfBirth,
                gender,
                consentGiven: true,
                consentDate: new Date(),
                source: 'ADMIN',
                status: 'ACTIVE',
                totalVisits: 0,
                totalSpent: 0
            }
        });

        return {
            id: newCustomer.id,
            name: newCustomer.name,
            email: newCustomer.email,
            phone: newCustomer.phone,
            tenantId: newCustomer.tenantId,
            status: newCustomer.status
        };
    }

    // Get tenant statistics
    async getTenantStats(tenantId: string) {
        const [
            userCount,
            customerCount,
            staffCount,
            appointmentCount,
            activeAppointmentCount
        ] = await Promise.all([
            prisma.user.count({
                where: { tenantId, isActive: true }
            }),
            prisma.customer.count({
                where: { tenantId, status: 'ACTIVE' }
            }),
            prisma.staff.count({
                where: { tenantId, isActive: true }
            }),
            prisma.appointment.count({
                where: { 
                    tenantId,
                    startTimeUtc: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            prisma.appointment.count({
                where: { 
                    tenantId,
                    status: 'BOOKED'
                }
            })
        ]);

        return {
            userCount,
            customerCount,
            staffCount,
            appointmentCount,
            activeAppointmentCount
        };
    }
}
