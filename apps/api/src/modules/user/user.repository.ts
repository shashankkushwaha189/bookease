import { PrismaClient, User, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new user
   */
  async create(userData: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    tenantId: string;
  }): Promise<User> {
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
  async findById(id: string): Promise<User | null> {
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
  async findByEmail(email: string): Promise<User | null> {
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
  async findByTenant(
    tenantId: string, 
    role?: UserRole,
    includeInactive = false
  ): Promise<User[]> {
    const whereClause: any = {
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
  async update(
    id: string,
    updateData: Partial<Pick<User, 'name' | 'email' | 'role'>>
  ): Promise<User> {
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
  async updatePassword(userId: string, hashedPassword: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * Soft delete user
   */
  async softDelete(id: string): Promise<User> {
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
  async restore(id: string): Promise<User> {
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
  async findActiveByTenant(tenantId: string, role?: UserRole): Promise<User[]> {
    return this.findByTenant(tenantId, role, false);
  }

  /**
   * Search users by name or email within tenant
   */
  async search(
    tenantId: string,
    query: string,
    limit = 10
  ): Promise<User[]> {
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
  async countByTenant(tenantId: string, role?: UserRole): Promise<number> {
    const whereClause: any = {
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
  async emailExistsInTenant(email: string, tenantId: string): Promise<boolean> {
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
  async getAuthUser(email: string): Promise<User | null> {
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
  async findByRole(tenantId: string, role: UserRole): Promise<User[]> {
    return this.findByTenant(tenantId, role);
  }

  /**
   * Get admins for tenant
   */
  async getTenantAdmins(tenantId: string): Promise<User[]> {
    return this.findByRole(tenantId, UserRole.ADMIN);
  }

  /**
   * Get staff for tenant
   */
  async getTenantStaff(tenantId: string): Promise<User[]> {
    return this.findByRole(tenantId, UserRole.STAFF);
  }
}
