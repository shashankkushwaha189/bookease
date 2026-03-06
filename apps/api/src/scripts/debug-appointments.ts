import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugAppointmentAPI() {
  try {
    console.log('🔍 Debugging Appointments API...');
    
    // Test the appointments endpoint directly
    const response = await fetch('http://localhost:3000/api/appointments', {
      headers: {
        'Authorization': 'Bearer [TOKEN]', // You'll need to replace with actual token
        'X-Tenant-ID': 'b18e0808-27d1-4253-aca9-453897585106'
      }
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Appointments API working');
    } else {
      console.log('❌ Appointments API failed with status:', response.status);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAppointmentAPI();
