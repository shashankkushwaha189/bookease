"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
var client_1 = require("../generated/client");
var pg_1 = require("pg");
var adapter_pg_1 = require("@prisma/adapter-pg");
var env_1 = require("../config/env");
var globalForPrisma = global;
var pool = new pg_1.Pool({ connectionString: env_1.env.DATABASE_URL });
var adapter = new adapter_pg_1.PrismaPg(pool);
exports.prisma = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        adapter: adapter,
        log: env_1.env.NODE_ENV === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
    });
if (env_1.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
