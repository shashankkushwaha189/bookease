const axios = require('axios');

async function testStaffAccess() {
  const tenantSlug = 'wellness-spa-v2';
  const baseUrl = 'http://localhost:3000';
  
  // Test staff login and what endpoints they can access
  const staffLogin = await axios.post(`${baseUrl}/api/auth/login`, {
    email: 'michael.therapist@wellness-spa.com',
    password: 'Staff123!'
  }, {
    headers: {
      'X-Tenant-Slug': tenantSlug,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('✅ Staff login successful');
  console.log('Role:', staffLogin.data.data.user.role);
  console.log('Tenant UUID:', staffLogin.data.data.user.tenantId);
  
  const token = staffLogin.data.data.token;
  const tenantId = staffLogin.data.data.user.tenantId;
  
  // Test various endpoints
  const endpoints = [
    '/api/staff',
    '/api/services',
    '/api/appointments',
    '/api/customers'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Slug': tenantSlug,
          'X-Tenant-ID': tenantId
        }
      });
      console.log(`✅ ${endpoint} - SUCCESS (${response.data.data?.length || 0} items)`);
    } catch (error) {
      console.log(`❌ ${endpoint} - ${error.response.status} (${error.response.data?.error?.message})`);
    }
  }
}

testStaffAccess().catch(console.error);
