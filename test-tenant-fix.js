const axios = require('axios');

async function testLogin() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'spa-admin@wellness-spa.com',
      password: 'SpaAdmin123!'
    }, {
      headers: {
        'X-Tenant-Slug': 'wellness-spa-v2',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login SUCCESS');
    console.log('User:', response.data.data.user.email);
    console.log('Role:', response.data.data.user.role);
    console.log('Tenant UUID:', response.data.data.user.tenantId);
    
    // Test staff endpoint
    const token = response.data.data.token;
    const staffResponse = await axios.get('http://localhost:3000/api/staff?includeServices=true', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Slug': 'wellness-spa-v2',
        'X-Tenant-ID': response.data.data.user.tenantId
      }
    });
    
    console.log('✅ Staff endpoint SUCCESS');
    console.log('Staff count:', staffResponse.data.data?.length || 0);
    
  } catch (error) {
    console.log('❌ FAILED');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testLogin();
