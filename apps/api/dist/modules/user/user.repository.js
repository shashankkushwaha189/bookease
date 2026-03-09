"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const client_1 = require("@prisma/client");
class UserRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * Create a new user
     */
    async create(userData) {
        return this.prisma.user.create({
            data: {
                ...userData,
                isActive: true,
            },
        });
    }
    /**
     * Find user by ID
     */
    async findById(id) {
        return this.prisma.user.findUnique({
            where: { id },
            include: {
                tenant: true,
            },
        });
    }
    /**
     * Find user by email
     */
    async findByEmail(email) {
        return this.prisma.user.findFirst({
            where: {
                email: email.toLowerCase(),
                isActive: true,
            },
            include: {
                tenant: true,
            },
        });
    }
    /**
     * Find users by tenant
     */
    async findByTenant(tenantId, role, includeInactive = false) {
        const whereClause = {
            tenantId,
        };
        if (role) {
            whereClause.role = role;
        }
        if (!includeInactive) {
            whereClause.isActive = true;
        }
        return this.prisma.user.findMany({
            where: whereClause,
            include: {
                tenant: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    /**
     * Update user
     */
    async update(id, updateData) {
        return this.prisma.user.update({
            where: { id },
            data: updateData,
            include: {
                tenant: true,
            },
        });
    }
    /**
     * Update user password
     */
    async updatePassword(userId, hashedPassword) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
    }
    /**
     * Soft delete user
     */
    async softDelete(id) {
        return this.prisma.user.update({
            where: { id },
            data: {
                isActive: false,
                deletedAt: new Date(),
            },
        });
    }
    /**
     * Restore user
     */
    async restore(id) {
        return this.prisma.user.update({
            where: { id },
            data: {
                isActive: true,
                deletedAt: null,
            },
        });
    }
    /**
     * Find active users by tenant
     */
    async findActiveByTenant(tenantId, role) {
        return this.findByTenant(tenantId, role, false);
    }
    /**
     * Search users by name or email within tenant
     */
    async search(tenantId, query, limit = 10) {
        return this.prisma.user.findMany({
            where: {
                tenantId,
                isActive: true,
                OR: [
                    {
                        name: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                    {
                        email: {
                            contains: query,
                            mode: 'insensitive',
                        },
                    },
                ],
            },
            include: {
                tenant: true,
            },
            take: limit,
            orderBy: {
                name: 'asc',
            },
        });
    }
    /**
     * Count users by tenant
     */
    async countByTenant(tenantId, role) {
        const whereClause = {
            tenantId,
            isActive: true,
        };
        if (role) {
            whereClause.role = role;
        }
        return this.prisma.user.count({
            where: whereClause,
        });
    }
    /**
     * Check if email exists in tenant
     */
    async emailExistsInTenant(email, tenantId) {
        const user = await this.prisma.user.findFirst({
            where: {
                email: email.toLowerCase(),
                tenantId,
                isActive: true,
            },
        });
        return !!user;
    }
    /**
     * Get user with authentication details
     */
    async getAuthUser(email) {
        return this.prisma.user.findFirst({
            where: {
                email: email.toLowerCase(),
                isActive: true,
            },
            include: {
                tenant: true,
            },
        });
    }
    /**
     * Get users by role within tenant
     */
    async findByRole(tenantId, role) {
        return this.findByTenant(tenantId, role);
    }
    /**
     * Get admins for tenant
     */
    async getTenantAdmins(tenantId) {
        return this.findByRole(tenantId, client_1.UserRole.ADMIN);
    }
    /**
     * Get staff for tenant
     */
    async getTenantStaff(tenantId) {
        return this.findByRole(tenantId, client_1.UserRole.STAFF);
    }
}
exports.UserRepository = UserRepository;
