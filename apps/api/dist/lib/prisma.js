"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const env_1 = require("../config/env");
const globalForPrisma = global;
const pool = new pg_1.Pool({ connectionString: env_1.env.DATABASE_URL });
exports.prisma = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        log: env_1.env.NODE_ENV === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
    });
if (env_1.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
