const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking Database Content...\n');

    // Check tenants
    const tenants = await prisma.tenant.findMany();
    console.log(`📍 Tenants: ${tenants.length}`);
    tenants.forEach(t => console.log(`  - ${t.name} (${t.slug})`));

    // Check services
    const services = await prisma.service.findMany();
    console.log(`\n🔧 Services: ${services.length}`);
    services.forEach(s => console.log(`  - ${s.name}`));

    // Check staff
    const staff = await prisma.staff.findMany();
    console.log(`\n👥 Staff: ${staff.length}`);
    staff.forEach(s => console.log(`  - ${s.name}`));

    // Check customers
    const customers = await prisma.customer.findMany();
    console.log(`\n👤 Customers: ${customers.length}`);
    customers.forEach(c => console.log(`  - ${c.name}`));

    // Check appointments
    const appointments = await prisma.appointment.findMany();
    console.log(`\n📅 Appointments: ${appointments.length}`);

    // Check users
    const users = await prisma.user.findMany();
    console.log(`\n🔐 Users: ${users.length}`);
    users.forEach(u => console.log(`  - ${u.email} (${u.role})`));

    console.log('\n✅ Database check complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
