"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function testTenantLookup() {
    try {
        console.log('🔍 Testing tenant lookup...');
        // Test with exact tenant ID from database
        const exactTenantId = 'b18e0808-27d1-4253-aca9-453897585106';
        const slugTenantId = 'demo-clinic';
        console.log('Testing with exact tenant ID:', exactTenantId);
        const userByExactId = await prisma.user.findFirst({
            where: {
                tenantId: exactTenantId,
                email: 'admin@demo.com'
            }
        });
        console.log('User found by exact ID:', userByExactId ? 'YES' : 'NO');
        console.log('\nTesting with slug tenant ID:', slugTenantId);
        const userBySlugId = await prisma.user.findFirst({
            where: {
                tenantId: slugTenantId,
                email: 'admin@demo.com'
            }
        });
        console.log('User found by slug ID:', userBySlugId ? 'YES' : 'NO');
        // Check what the actual tenant record looks like
        const tenant = await prisma.tenant.findUnique({
            where: { id: exactTenantId }
        });
        console.log('\nActual tenant record:');
        if (tenant) {
            console.log('  ID:', tenant.id);
            console.log('  Name:', tenant.name);
            console.log('  Slug:', tenant.slug);
        }
        else {
            console.log('  NOT FOUND');
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
testTenantLookup();
