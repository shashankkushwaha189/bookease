"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
var zod_1 = require("zod");
var dotenv_1 = __importDefault(require("dotenv"));
var path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../../.env') });
var envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(3000),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: zod_1.z.string().url(),
    JWT_SECRET: zod_1.z.string().min(32),
    CORS_ORIGIN: zod_1.z.string().default('*'),
});
var envParseResult = envSchema.safeParse(process.env);
if (!envParseResult.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(envParseResult.error.format(), null, 2));
    process.exit(1);
}
exports.env = envParseResult.data;
