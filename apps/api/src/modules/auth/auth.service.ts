import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { LoginInput, RegisterInput } from './auth.schema';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AppError } from '../../lib/errors';

export class AuthService {
    private readonly saltRounds = 12;

    async login(tenantId: string, input: LoginInput) {
        // Since schema doesn't have tenantSlug in User, we check if user exists in that tenant
        const user = await prisma.user.findFirst({
            where: {
                tenantId,
                email: input.email,
            }
        });

        if (!user || !user.passwordHash) {
            throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
        }

        const isValid = await bcrypt.compare(input.password, user.passwordHash);
        if (!isValid) {
            throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
        }

        const token = jwt.sign(
            {
                sub: user.id, // Using 'sub' to match AuthMiddleware expected decoded token
                role: user.role,
                tenantId: user.tenantId
            },
            env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId
            }
        };
    }

    async register(tenantId: string, input: RegisterInput) {
        // Check if user already exists in this tenant
        const existingUser = await prisma.user.findFirst({
            where: {
                tenantId,
                email: input.email,
            }
        });

        if (existingUser) {
            throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(input.password, this.saltRounds);

        // Create new user
        const newUser = await prisma.user.create({
            data: {
                tenantId,
                email: input.email,
                passwordHash,
                role: UserRole.USER, // Default role for new registrations
                isActive: true,
                firstName: input.firstName,
                lastName: input.lastName
            }
        });

        // Generate JWT token
        const token = jwt.sign(
            {
                sub: newUser.id,
                role: newUser.role,
                tenantId: newUser.tenantId
            },
            env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                role: newUser.role,
                tenantId: newUser.tenantId
            }
        };
    }
}

export const authService = new AuthService();
