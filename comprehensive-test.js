const axios = require('axios');

async function comprehensiveTest() {
  console.log('🔍 Comprehensive System Test\n');

  // Test 1: Wellness Spa Admin Login
  console.log('1. Testing Wellness Spa Admin Login...');
  try {
    const spaLogin = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'spa-admin@wellness-spa.com',
      password: 'SpaAdmin123!'
    }, { headers: { 'X-Tenant-Slug': 'wellness-spa-v2' } });

    console.log('✅ Spa Admin Login: SUCCESS');
    console.log('   User:', spaLogin.data.data.user.email);
    console.log('   Role:', spaLogin.data.data.user.role);

    // Test Reports with Spa Token
    const spaToken = spaLogin.data.data.token;
    const reportsResponse = await axios.get('http://localhost:3000/api/reports/summary?from=2026-03-12&to=2026-03-12', {
      headers: {
        'Authorization': `Bearer ${spaToken}`,
        'X-Tenant-Slug': 'wellness-spa-v2'
      }
    });
    console.log('✅ Spa Reports Access: SUCCESS');

  } catch (error) {
    console.log('❌ Spa Admin Test: FAILED');
    console.log('   Error:', error.response?.status, error.response?.data);
  }

  // Test 2: Demo User Login (should be USER role)
  console.log('\n2. Testing Demo User Login...');
  try {
    const demoLogin = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@demo.com',
      password: 'demo123456'
    }, { headers: { 'X-Tenant-Slug': 'demo-clinic' } });

    console.log('✅ Demo User Login: SUCCESS');
    console.log('   User:', demoLogin.data.data.user.email);
    console.log('   Role:', demoLogin.data.data.user.role);

    // Test Reports with Demo Token (should fail)
    const demoToken = demoLogin.data.data.token;
    try {
      await axios.get('http://localhost:3000/api/reports/summary?from=2026-03-12&to=2026-03-12', {
        headers: {
          'Authorization': `Bearer ${demoToken}`,
          'X-Tenant-Slug': 'demo-clinic'
        }
      });
      console.log('❌ Demo Reports Access: UNEXPECTED SUCCESS (should fail)');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Demo Reports Access: CORRECTLY BLOCKED (403 Forbidden)');
      } else {
        console.log('❌ Demo Reports Access: Wrong error:', error.response?.status);
      }
    }

  } catch (error) {
    console.log('❌ Demo User Test: FAILED');
    console.log('   Error:', error.response?.status, error.response?.data);
  }

  // Test 3: Tenant Resolution
  console.log('\n3. Testing Tenant Resolution...');
  const tenants = ['wellness-spa-v2', 'demo-clinic'];
  for (const tenant of tenants) {
    try {
      const response = await axios.get('http://localhost:3000/api/public/services', {
        headers: { 'X-Tenant-Slug': tenant }
      });
      console.log(`✅ Tenant ${tenant}: EXISTS`);
    } catch (error) {
      console.log(`❌ Tenant ${tenant}: NOT FOUND`);
    }
  }

  console.log('\n📋 Summary:');
  console.log('- Admin users should have access to all endpoints');
  console.log('- User role accounts should be blocked from admin endpoints');
  console.log('- All tenants should resolve correctly');
  console.log('- Login should work for all valid users');
}

comprehensiveTest();
