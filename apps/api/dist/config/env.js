"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env file if it exists, but don't fail if it doesn't
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../../.env') });
// Debug logging for PORT
console.log('🔍 Debug - process.env.PORT:', process.env.PORT);
console.log('🔍 Debug - process.env:', Object.keys(process.env).filter(k => k.includes('PORT')));
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(() => {
        // Use Render's port first, then fallback to 3000
        const renderPort = process.env.KUBERNETES_SERVICE_PORT || process.env.PORT;
        return renderPort ? parseInt(renderPort) : 3000;
    }),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: zod_1.z.string().url(),
    JWT_SECRET: zod_1.z.string().min(32),
    CORS_ORIGIN: zod_1.z.string().default('*'),
});
const envParseResult = envSchema.safeParse(process.env);
if (!envParseResult.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(envParseResult.error.format(), null, 2));
    process.exit(1);
}
exports.env = envParseResult.data;
// Debug logging for final env
console.log('🔍 Debug - env.PORT:', exports.env.PORT);
