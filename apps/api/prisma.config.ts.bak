import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly load .env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
    schema: './prisma/schema.prisma',
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
