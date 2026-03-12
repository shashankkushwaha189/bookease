const axios = require('axios');

async function testSpecificUser() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'sarah.therapist@wellness-spa.com',
      password: 'Staff123!'
    }, {
      headers: {
        'X-Tenant-Slug': 'wellness-spa-v2',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ SUCCESS!');
    console.log('User:', response.data.data.user.email);
    console.log('Role:', response.data.data.user.role);
    console.log('Token:', response.data.data.token.substring(0, 50) + '...');
    
  } catch (error) {
    console.log('❌ FAILED');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data?.error?.message);
    console.log('Full error:', JSON.stringify(error.response?.data, null, 2));
  }
}

testSpecificUser();
