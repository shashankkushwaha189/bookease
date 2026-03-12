const axios = require('axios');

async function testCustomerRegistration() {
  const tenantSlug = 'wellness-spa-v2';
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔍 Testing customer registration for Wellness Spa...');
  
  try {
    // Check available services
    const servicesResponse = await axios.get(`${baseUrl}/api/public/services`, {
      headers: {
        'X-Tenant-Slug': tenantSlug
      }
    });
    
    console.log('✅ Available services at Wellness Spa:');
    servicesResponse.data.data.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name} - $${service.price} (${service.duration}min)`);
    });
    
    // Check available staff
    const staffResponse = await axios.get(`${baseUrl}/api/public/staff`, {
      headers: {
        'X-Tenant-Slug': tenantSlug
      }
    });
    
    console.log('\n✅ Available staff at Wellness Spa:');
    staffResponse.data.data.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.email} (${staff.role || 'STAFF'})`);
    });
    
    console.log('\n📋 Customer Registration Flow:');
    console.log('1. Visit: http://localhost:5173/register?tenant=wellness-spa-v2');
    console.log('2. Fill registration form');
    console.log('3. Login with customer credentials');
    console.log('4. Browse services and book appointments');
    
  } catch (error) {
    console.log('❌ Error checking services/staff:', error.response?.data?.error?.message);
  }
}

testCustomerRegistration();
