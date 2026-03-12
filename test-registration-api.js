const axios = require('axios');

async function testRegistrationAPI() {
  console.log('🧪 Testing registration API with tenant selection...\n');
  
  const baseUrl = 'http://localhost:3000';
  const testCustomer = {
    email: `test.register.${Date.now()}@test.com`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: '+1234567890'
  };
  
  console.log('1️⃣ Testing registration with wellness-spa-v2...');
  try {
    const response = await axios.post(`${baseUrl}/api/auth/register`, {
      ...testCustomer,
      tenantSlug: 'wellness-spa-v2'
    }, {
      headers: {
        'X-Tenant-Slug': 'wellness-spa-v2',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Registration API SUCCESS');
    console.log('   Response:', response.data);
    
  } catch (error) {
    console.log('❌ Registration API FAILED');
    console.log('   Status:', error.response?.status);
    console.log('   Error:', error.response?.data);
  }
  
  console.log('\n2️⃣ Checking registration endpoint exists...');
  try {
    const response = await axios.get(`${baseUrl}/api/auth/register`, {
      headers: {
        'X-Tenant-Slug': 'wellness-spa-v2'
      }
    });
    console.log('✅ Endpoint accessible');
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ Registration endpoint not found (404)');
    } else if (error.response?.status === 405) {
      console.log('✅ Endpoint exists but wrong method (405) - this is expected');
    } else {
      console.log('❌ Other error:', error.response?.status);
    }
  }
}

testRegistrationAPI();
