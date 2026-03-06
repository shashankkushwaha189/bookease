"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkDatabase() {
    try {
        console.log('🔍 Checking database connection...');
        // Test basic connection
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        // Test basic query
        const tenantCount = await prisma.tenant.count();
        console.log(`✅ Database query successful - Found ${tenantCount} tenants`);
        // Test tables exist
        const tables = ['tenant', 'user', 'service', 'staff', 'customer', 'appointment'];
        for (const table of tables) {
            try {
                const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
                console.log(`✅ Table ${table}: OK`);
            }
            catch (error) {
                console.log(`❌ Table ${table}: Error - ${error}`);
            }
        }
        await prisma.$disconnect();
        console.log('✅ Database check completed');
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}
checkDatabase();
