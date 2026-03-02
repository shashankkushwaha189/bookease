import { prisma } from '../src/lib/prisma';

async function analyze() {
    const tenantId = 'demo-clinic';
    const staffId = 'dummy-staff';

    console.log('\n--- 1. Appointments by Date Range (EXPLAIN ANALYZE) ---');
    const q1 = await prisma.$queryRaw<any[]>`EXPLAIN ANALYZE SELECT * FROM "Appointment" WHERE "tenantId" = ${tenantId} AND "startTimeUtc" >= '2026-10-01'::timestamp`;
    console.log(q1.map((r: any) => r['QUERY PLAN']).join('\\n'));

    console.log('\n--- 2. Appointments by Status (EXPLAIN ANALYZE) ---');
    const q2 = await prisma.$queryRaw<any[]>`EXPLAIN ANALYZE SELECT * FROM "Appointment" WHERE "tenantId" = ${tenantId} AND "status" = 'COMPLETED'`;
    console.log(q2.map((r: any) => r['QUERY PLAN']).join('\\n'));

    console.log('\n--- 3. Slot Locks Collision Detection (EXPLAIN ANALYZE) ---');
    const q3 = await prisma.$queryRaw<any[]>`EXPLAIN ANALYZE SELECT * FROM "SlotLock" WHERE "tenantId" = ${tenantId} AND "staffId" = ${staffId} AND "startTimeUtc" >= '2026-10-01'::timestamp AND "startTimeUtc" < '2026-10-31'::timestamp`;
    console.log(q3.map((r: any) => r['QUERY PLAN']).join('\\n'));

    console.log('\n--- 4. Peak Times Heatmap Aggregation (EXPLAIN ANALYZE) ---');
    const q4 = await prisma.$queryRaw<any[]>`EXPLAIN ANALYZE SELECT EXTRACT(ISODOW FROM "startTimeUtc"), EXTRACT(HOUR FROM "startTimeUtc"), count(*) FROM "Appointment" WHERE "tenantId" = ${tenantId} GROUP BY 1, 2`;
    console.log(q4.map((r: any) => r['QUERY PLAN']).join('\\n'));

    console.log('\n--- 5. Staff Time Off Range Scans (EXPLAIN ANALYZE) ---');
    const q5 = await prisma.$queryRaw<any[]>`EXPLAIN ANALYZE SELECT * FROM "StaffTimeOff" WHERE "staffId" = ${staffId} AND "date" >= '2026-10-01'::timestamp`;
    console.log(q5.map((r: any) => r['QUERY PLAN']).join('\\n'));
}

analyze()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
