import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { LoginInput } from './auth.schema';
import { User, UserRole } from '../../generated/client';
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
}

export const authService = new AuthService();
