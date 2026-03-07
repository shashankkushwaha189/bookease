"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const env_1 = require("../config/env");
// Simple Prisma client initialization
exports.prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: env_1.env.DATABASE_URL
        }
    },
    log: env_1.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
});
// Test connection on startup
async function initializeDatabase() {
    try {
        await exports.prisma.$connect();
        console.log('Database connected successfully');
    }
    catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
}
// Initialize database connection
initializeDatabase();
