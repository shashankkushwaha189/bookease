import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file if it exists, but don't fail if it doesn't
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Debug logging for PORT
console.log('🔍 Debug - process.env.PORT:', process.env.PORT);
console.log('🔍 Debug - process.env:', Object.keys(process.env).filter(k => k.includes('PORT')));

const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    CORS_ORIGIN: z.string().default('*'),
});

const envParseResult = envSchema.safeParse(process.env);

if (!envParseResult.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(envParseResult.error.format(), null, 2));
    process.exit(1);
}

export const env = envParseResult.data;

// Debug logging for final env
console.log('🔍 Debug - env.PORT:', env.PORT);
