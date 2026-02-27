import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { LoginInput } from './auth.schema';
import { User } from '@prisma/client';

export class AuthService {
    private readonly saltRounds = 12;

    async login(tenantId: string, { email, password }: LoginInput) {
        const user = await prisma.user.findFirst({
            where: {
                tenantId,
                email,
                isActive: true,
            },
        }) as User | null;

        if (!user) {
            throw this.invalidCredentialsError();
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            throw this.invalidCredentialsError();
        }

        const token = jwt.sign(
            {
                sub: user.id,
                tenantId: user.tenantId,
                role: user.role,
            },
            env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        };
    }

    private invalidCredentialsError() {
        const error = new Error('Invalid credentials');
        (error as any).code = 'UNAUTHORIZED';
        (error as any).status = 401;
        return error;
    }
}
