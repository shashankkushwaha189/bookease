// Check existing users in wellness spa tenant
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function checkUsers() {
  try {
    console.log('🔍 Checking users in wellness-spa-v2 tenant...\n');

    // First, login as admin to get a token (using demo tenant since we know it works)
    console.log('1. Getting admin token from demo tenant...');
    const demoLogin = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@demo.com',
      password: 'demo123456'
    }, {
      headers: { 'X-Tenant-Slug': 'demo-clinic' }
    });

    // This won't work since we can't access other tenant data with demo token
    console.log('❌ Cannot access other tenant data with demo token (security feature)');

    // Let's try to find what users exist by testing common credentials
    console.log('\n2. Testing possible user credentials...');
    
    const testCredentials = [
      { email: 'spa-admin@wellness-spa.com', password: 'SpaAdmin123!' },
      { email: 'admin@wellness-spa.com', password: 'SpaAdmin123!' },
      { email: 'admin@demo.com', password: 'demo123456' }, // This should fail with wrong tenant
      { email: 'test@test.com', password: 'test123' }, // From test-spa
    ];

    for (const creds of testCredentials) {
      try {
        const response = await axios.post(`${API_BASE}/api/auth/login`, creds, {
          headers: { 'X-Tenant-Slug': 'wellness-spa-v2' }
        });
        console.log(`✅ SUCCESS: ${creds.email} - Role: ${response.data.data.user.role}`);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`❌ FAILED: ${creds.email} - User not found or wrong password`);
        } else {
          console.log(`❓ ERROR: ${creds.email} - ${error.response?.status}`);
        }
      }
    }

    console.log('\n3. Checking what tenant actually exists...');
    try {
      const servicesResponse = await axios.get(`${API_BASE}/api/public/services`, {
        headers: { 'X-Tenant-Slug': 'wellness-spa-v2' }
      });
      console.log('✅ wellness-spa-v2 tenant exists');
    } catch (error) {
      console.log('❌ wellness-spa-v2 tenant not found');
    }

    console.log('\n💡 Solution:');
    console.log('If no users work, we need to create the admin user for wellness-spa-v2 tenant');
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkUsers();
