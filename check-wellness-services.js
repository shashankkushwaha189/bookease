const axios = require('axios');

async function checkServicesAndBooking() {
  const tenantSlug = 'wellness-spa-v2';
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Login as admin to check full services
    const adminLogin = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'spa-admin@wellness-spa.com',
      password: 'SpaAdmin123!'
    }, {
      headers: {
        'X-Tenant-Slug': tenantSlug,
        'Content-Type': 'application/json'
      }
    });
    
    const token = adminLogin.data.data.token;
    const tenantId = adminLogin.data.data.user.tenantId;
    
    // Get services
    const servicesResponse = await axios.get(`${baseUrl}/api/services`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Slug': tenantSlug,
        'X-Tenant-ID': tenantId
      }
    });
    
    console.log('✅ Wellness Spa Services:');
    servicesResponse.data.data.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name || service.id}`);
      console.log(`   Price: $${service.price || 'N/A'}`);
      console.log(`   Duration: ${service.duration || 'N/A'} minutes`);
      console.log('');
    });
    
    // Get staff for booking
    const staffResponse = await axios.get(`${baseUrl}/api/staff`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Slug': tenantSlug,
        'X-Tenant-ID': tenantId
      }
    });
    
    console.log('✅ Wellness Spa Staff (available for appointments):');
    staffResponse.data.data.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.firstName || ''} ${staff.lastName || ''} (${staff.email})`);
    });
    
    console.log('\n📋 How Customers Can Book:');
    console.log('1. Registration: http://localhost:5173/register?tenant=wellness-spa-v2');
    console.log('2. Login: http://localhost:5173/login?tenant=wellness-spa-v2');
    console.log('3. After login, customers can:');
    console.log('   - View services');
    console.log('   - See available time slots');
    console.log('   - Book appointments');
    console.log('   - Manage their bookings');
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.error?.message);
  }
}

checkServicesAndBooking();
