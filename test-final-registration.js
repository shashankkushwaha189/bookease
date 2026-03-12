const axios = require('axios');

async function testFixedRegistration() {
  console.log('🧪 Testing fixed registration endpoint...\n');
  
  const baseUrl = 'http://localhost:3000';
  const testCustomer = {
    firstName: 'Shashank',
    lastName: 'Kushwaha',
    email: 'shashank.test@example.com',
    password: 'TestPass123!',
    tenantSlug: 'wellness-spa-v2',
    phoneNumber: '+1234567890'
  };
  
  console.log('📝 Sending registration to /api/auth/register...');
  console.log('Data:', testCustomer);
  
  try {
    const response = await axios.post(`${baseUrl}/api/auth/register`, testCustomer, {
      headers: {
        'X-Tenant-Slug': 'wellness-spa-v2',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Registration SUCCESS!');
    console.log('   User:', response.data.data.user.email);
    console.log('   Role:', response.data.data.user.role);
    console.log('   Tenant ID:', response.data.data.user.tenantId);
    console.log('   Token received:', !!response.data.data.token);
    
    console.log('\n🎉 Registration is now WORKING!');
    
  } catch (error) {
    console.log('❌ Registration FAILED');
    console.log('   Status:', error.response?.status);
    console.log('   Error:', error.response?.data?.error?.message || error.response?.data);
  }
}

testFixedRegistration();
