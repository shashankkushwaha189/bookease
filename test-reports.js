const axios = require('axios');

async function testReports() {
  try {
    // First login to get token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'spa-admin@wellness-spa.com',
      password: 'SpaAdmin123!'
    }, {
      headers: { 'X-Tenant-Slug': 'wellness-spa-v2' }
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Got token, testing reports endpoint...');
    
    // Test reports endpoint
    const reportsResponse = await axios.get('http://localhost:3000/api/reports/summary?from=2026-03-12&to=2026-03-12', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Slug': 'wellness-spa-v2'
      }
    });
    
    console.log('✅ Reports endpoint works:', reportsResponse.status);
    console.log('Data:', reportsResponse.data);
  } catch (error) {
    console.log('❌ Reports error:', error.response?.status);
    console.log('Error data:', error.response?.data);
  }
}

testReports();
