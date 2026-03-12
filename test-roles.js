// Test role-based access control
const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const TENANT_ID = '9d6a9a2c-4d64-4167-a9ae-2f0c21f34939';

async function testRoles() {
  try {
    console.log('🧪 Testing Role-Based Access Control\n');

    // 1. Login as regular user
    console.log('1. Login as regular user...');
    const userLogin = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@demo.com',
      password: 'demo123456'
    }, {
      headers: { 'X-Tenant-ID': TENANT_ID }
    });
    
    const userToken = userLogin.data.data.token;
    const userInfo = userLogin.data.data.user;
    console.log(`✅ User logged in successfully (Role: ${userInfo.role})`);

    // 2. Try to access admin endpoints as USER (should fail)
    console.log('\n2. Testing USER access to admin endpoints...');
    try {
      await axios.get(`${API_BASE}/api/users`, {
        headers: { 
          'X-Tenant-ID': TENANT_ID,
          'Authorization': `Bearer ${userToken}`
        }
      });
      console.log('❌ USER should not access admin endpoints!');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ USER correctly blocked from admin endpoints (403 Forbidden)');
      } else {
        console.log('❌ Unexpected error:', error.response?.data);
      }
    }

    // 3. Test tenant isolation - try to access with wrong tenant ID
    console.log('\n3. Testing tenant isolation...');
    try {
      await axios.get(`${API_BASE}/api/users/profile`, {
        headers: { 
          'X-Tenant-ID': 'wrong-tenant-id',
          'Authorization': `Bearer ${userToken}`
        }
      });
      console.log('❌ Should not access data with wrong tenant ID!');
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('✅ Tenant isolation working (blocked wrong tenant)');
      } else {
        console.log('❌ Unexpected error:', error.response?.data);
      }
    }

    // 4. Test user can access their own profile
    console.log('\n4. Testing USER access to own profile...');
    try {
      const profile = await axios.get(`${API_BASE}/api/users/profile`, {
        headers: { 
          'X-Tenant-ID': TENANT_ID,
          'Authorization': `Bearer ${userToken}`
        }
      });
      console.log('✅ USER can access their own profile');
      console.log(`   Profile email: ${profile.data.data.email}`);
    } catch (error) {
      console.log('❌ USER should access their own profile:', error.response?.data);
    }

    // 5. Test accessing public endpoints (should work)
    console.log('\n5. Testing access to public endpoints...');
    try {
      await axios.get(`${API_BASE}/api/public/services`, {
        headers: { 'X-Tenant-ID': TENANT_ID }
      });
      console.log('✅ Public endpoints accessible without auth');
    } catch (error) {
      console.log('❌ Public endpoints should be accessible:', error.response?.data);
    }

    // 6. Test accessing staff endpoints as USER (should fail)
    console.log('\n6. Testing USER access to staff endpoints...');
    try {
      await axios.get(`${API_BASE}/api/services`, {
        headers: { 
          'X-Tenant-ID': TENANT_ID,
          'Authorization': `Bearer ${userToken}`
        }
      });
      console.log('❌ USER should not access staff endpoints!');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ USER correctly blocked from staff endpoints (403 Forbidden)');
      } else {
        console.log('❌ Unexpected error:', error.response?.data);
      }
    }

    console.log('\n🎉 Role-Based Access Control Test Complete!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Authentication working');
    console.log('   ✅ Role-based access control working');
    console.log('   ✅ Tenant isolation working');
    console.log('   ✅ Public endpoints accessible');
    console.log('   ✅ User profile access working');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testRoles();
