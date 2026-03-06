import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file if it exists, but don't fail if it doesn't
dotenv.config({ path: path.resolve(__dirname, '../../../../.env'), override: true });

const envSchema = z.object({
    PORT: z.coerce.number().default(() => {
        // Use Render's port first, then fallback to 3000
        const renderPort = process.env.KUBERNETES_SERVICE_PORT || process.env.PORT;
        return renderPort ? parseInt(renderPort) : 3000;
    }),
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
