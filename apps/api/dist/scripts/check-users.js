"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkUsers() {
    try {
        console.log('🔍 Checking existing users...');
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                tenantId: true
            }
        });
        console.log(`Found ${users.length} users:`);
        users.forEach(user => {
            console.log(`  - ID: ${user.id}`);
            console.log(`    Email: ${user.email}`);
            console.log(`    Role: ${user.role}`);
            console.log(`    Tenant: ${user.tenantId}`);
            console.log(`    Active: ${user.isActive}`);
            console.log('');
        });
        // Check specifically for admin user
        const adminUser = users.find(u => u.email.includes('admin'));
        if (adminUser) {
            console.log('✅ Found admin user:', adminUser.email);
        }
        else {
            console.log('❌ No admin user found');
            console.log('Available emails:', users.map(u => u.email));
        }
    }
    catch (error) {
        console.error('Error checking users:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkUsers();
