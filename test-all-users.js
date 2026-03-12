const axios = require('axios');

async function testAllUsers() {
  const tenantSlug = 'wellness-spa-v2';
  const baseUrl = 'http://localhost:3000';
  
  const users = [
    { email: 'spa-admin@wellness-spa.com', password: 'SpaAdmin123!', role: 'ADMIN' },
    { email: 'sarah.therapist@wellness-spa.com', password: 'staff123!', role: 'STAFF' },
    { email: 'michael.therapist@wellness-spa.com', password: 'Staff123!', role: 'STAFF' },
    { email: 'reception@wellness-spa.com', password: 'staff123!', role: 'STAFF' }
  ];
  
  for (const user of users) {
    console.log(`\n🔍 Testing ${user.role}: ${user.email}`);
    try {
      // Test login
      const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
        email: user.email,
        password: user.password
      }, {
        headers: {
          'X-Tenant-Slug': tenantSlug,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Login SUCCESS for ${user.email}`);
      console.log(`   Role: ${loginResponse.data.data.user.role}`);
      console.log(`   Tenant UUID: ${loginResponse.data.data.user.tenantId}`);
      
      // Test staff endpoint
      const token = loginResponse.data.data.token;
      const staffResponse = await axios.get(`${baseUrl}/api/staff?includeServices=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Slug': tenantSlug,
          'X-Tenant-ID': loginResponse.data.data.user.tenantId
        }
      });
      
      console.log(`✅ Staff endpoint SUCCESS for ${user.email}`);
      console.log(`   Staff count: ${staffResponse.data.data?.length || 0}`);
      
    } catch (error) {
      console.log(`❌ FAILED for ${user.email}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data?.error?.message || error.response.data}`);
      } else {
        console.log(`   Network error: ${error.message}`);
      }
    }
  }
}

testAllUsers();
