import { prisma } from './src/lib/prisma';

async function cleanup() {
    try {
        console.log('Starting cleanup...');
        await prisma.slotLock.deleteMany();
        console.log('SlotLock deleted');
        await prisma.booking.deleteMany();
        console.log('Booking deleted');
        await prisma.staffBreak.deleteMany();
        console.log('StaffBreak deleted');
        await prisma.weeklySchedule.deleteMany();
        console.log('WeeklySchedule deleted');
        await prisma.staffService.deleteMany();
        console.log('StaffService deleted');
        await prisma.staffTimeOff.deleteMany();
        console.log('StaffTimeOff deleted');
        await prisma.staff.deleteMany();
        console.log('Staff deleted');
        await prisma.service.deleteMany();
        console.log('Service deleted');
        await prisma.tenant.deleteMany();
        console.log('Tenant deleted');
        console.log('Cleanup successful');
    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
