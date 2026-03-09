"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const tenant_repository_1 = require("../tenant/tenant.repository");
class UserService {
    userRepository;
    tenantRepository;
    constructor(userRepository, tenantRepository) {
        this.userRepository = userRepository;
        this.tenantRepository = tenantRepository;
    }
    /**
     * Authenticate user with email and password
     */
    async authenticateUser(loginData) {
        const { email, password, tenantSlug } = loginData;
        // Find user by email
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }
        // Verify password
        const isPasswordValid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }
        // Verify tenant access if tenantSlug provided
        if (tenantSlug) {
            const tenant = await tenant_repository_1.TenantRepository.findBySlug(tenantSlug);
            if (!tenant || tenant.id !== user.tenantId) {
                throw new Error('Tenant access denied');
            }
        }
        // Get tenant info for token
        const tenant = await tenant_repository_1.TenantRepository.findById(user.tenantId);
        if (!tenant || !tenant.isActive) {
            throw new Error('Tenant is not active');
        }
        // Generate tokens
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            tenantSlug: tenant.slug,
        };
        const signOptions = {
            expiresIn: (process.env.JWT_EXPIRES_IN || '1h'),
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, process.env.JWT_SECRET, signOptions);
        const refreshOptions = {
            expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
        };
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, refreshOptions);
        // Calculate expiration
        const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
        const expiresAt = new Date();
        const [hours] = expiresIn.match(/(\d+)h/) || ['1'];
        expiresAt.setHours(expiresAt.getHours() + parseInt(hours[0]));
        // Remove password from user object
        const { passwordHash: _, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            token,
            refreshToken,
            expiresAt,
        };
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken) {
        try {
            const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            if (decoded.type !== 'refresh') {
                throw new Error('Invalid refresh token');
            }
            const user = await this.userRepository.findById(decoded.userId);
            if (!user) {
                throw new Error('User not found');
            }
            const tenant = await tenant_repository_1.TenantRepository.findById(user.tenantId);
            if (!tenant || !tenant.isActive) {
                throw new Error('Tenant is not active');
            }
            // Generate new tokens
            const tokenPayload = {
                userId: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                tenantSlug: tenant.slug,
            };
            const token = jsonwebtoken_1.default.sign(tokenPayload, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN || '1h',
            });
            const newRefreshToken = jsonwebtoken_1.default.sign({ userId: user.id, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
            // Calculate expiration
            const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
            const expiresAt = new Date();
            const [hours] = expiresIn.match(/(\d+)h/) || ['1'];
            expiresAt.setHours(expiresAt.getHours() + parseInt(hours[0]));
            const { password: _, ...userWithoutPassword } = user;
            return {
                user: userWithoutPassword,
                token,
                refreshToken: newRefreshToken,
                expiresAt,
            };
        }
        catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
    /**
     * Create new user
     */
    async createUser(userData) {
        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
        const hashedPassword = await bcrypt_1.default.hash(userData.password, saltRounds);
        // Create user
        const user = await this.userRepository.create({
            ...userData,
            passwordHash: hashedPassword,
        });
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    /**
     * Update user password
     */
    async updatePassword(userId, currentPassword, newPassword) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        // Verify current password
        const isCurrentPasswordValid = await bcrypt_1.default.compare(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
            throw new Error('Current password is incorrect');
        }
        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
        const hashedNewPassword = await bcrypt_1.default.hash(newPassword, saltRounds);
        // Update password
        await this.userRepository.updatePassword(userId, hashedNewPassword);
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            return null;
        }
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    /**
     * Get users by tenant
     */
    async getUsersByTenant(tenantId, role) {
        const users = await this.userRepository.findByTenant(tenantId, role);
        return users.map(user => {
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
    }
    /**
     * Update user
     */
    async updateUser(userId, updateData) {
        const user = await this.userRepository.update(userId, updateData);
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    /**
     * Delete user (soft delete)
     */
    async deleteUser(userId) {
        await this.userRepository.softDelete(userId);
    }
    /**
     * Verify JWT token
     */
    verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            return decoded;
        }
        catch (error) {
            throw new Error('Invalid token');
        }
    }
    /**
     * Update last login
     */
    async updateLastLogin(userId) {
        await this.userRepository.updateLastLogin(userId);
    }
    /**
     * Check if user has required role
     */
    hasRequiredRole(userRole, requiredRoles) {
        return requiredRoles.includes(userRole);
    }
    /**
     * Check if user can access tenant
     */
    async canAccessTenant(userId, tenantId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            return false;
        }
        return user.tenantId === tenantId;
    }
}
exports.UserService = UserService;
