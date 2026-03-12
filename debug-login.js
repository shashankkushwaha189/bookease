// Debug login issue
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function debugLogin() {
  console.log('🔍 Debugging Login Issue\n');

  // Test 1: Check if tenant exists
  console.log('1. Checking tenant wellness-spa-v2...');
  try {
    const response = await axios.get(`${API_BASE}/api/public/services`, {
      headers: { 'X-Tenant-Slug': 'wellness-spa-v2' }
    });
    console.log('✅ Tenant exists and is accessible');
  } catch (error) {
    console.log('❌ Tenant error:', error.response?.data);
    return;
  }

  // Test 2: Try login with detailed error info
  console.log('\n2. Testing login with wellness-spa-v2...');
  try {
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'spa-admin@wellness-spa.com',
      password: 'SpaAdmin123!'
    }, {
      headers: { 
        'X-Tenant-Slug': 'wellness-spa-v2',
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Login successful!');
    console.log('   Token length:', response.data.data.token.length);
    console.log('   User role:', response.data.data.user.role);
  } catch (error) {
    console.log('❌ Login failed:');
    console.log('   Status:', error.response?.status);
    console.log('   Error:', error.response?.data);
    
    if (error.response?.data?.error?.code === 'INVALID_CREDENTIALS') {
      console.log('   💡 This means the user doesn\'t exist or password is wrong');
    }
  }

  // Test 3: Check if user exists by trying to create them
  console.log('\n3. Checking if admin user exists...');
  try {
    // Try to get users list (should fail if not admin)
    const response = await axios.get(`${API_BASE}/api/users`, {
      headers: { 
        'X-Tenant-Slug': 'wellness-spa-v2'
      }
    });
    console.log('❌ Should not be able to access users without auth');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Properly protected (401 - auth required)');
    } else {
      console.log('❓ Unexpected error:', error.response?.status);
    }
  }

  // Test 4: Try with demo tenant to make sure login works there
  console.log('\n4. Testing demo tenant login...');
  try {
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@demo.com',
      password: 'demo123456'
    }, {
      headers: { 
        'X-Tenant-Slug': 'demo-clinic',
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Demo tenant login works');
  } catch (error) {
    console.log('❌ Demo tenant login failed:', error.response?.data);
  }

  console.log('\n📋 Summary:');
  console.log('- If API login works but frontend doesn\'t, it\'s a frontend issue');
  console.log('- If API login fails, the user might not exist in the tenant');
  console.log('- Try restarting the API server to pick up code changes');
}

debugLogin();
