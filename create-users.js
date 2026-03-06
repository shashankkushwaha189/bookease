const axios = require('axios');

const API_BASE = 'http://localhost:3000';

// Demo users to test
const demoUsers = [
  {
    email: 'admin@demo.com',
    password: 'demo123456',
    role: 'ADMIN',
    name: 'Admin User'
  },
  {
    email: 'staff@demo.com',
    password: 'demo123456',
    role: 'STAFF',
    name: 'Staff User'
  },
  {
    email: 'customer@demo.com',
    password: 'demo123456',
    role: 'USER',
    name: 'Customer User'
  }
];

async function checkUsers() {
  console.log('🔍 Checking Demo Users for BookEase...\n');

  try {
    // First, let's try to find the correct tenant ID by testing different ones
    const possibleTenantIds = [
      'b18e0808-27d1-4253-aca9-453897585106', // Original hardcoded ID
      'demo-clinic' // The slug from seed
    ];

    let workingTenantId = null;

    for (const tenantId of possibleTenantIds) {
      try {
        console.log(`🧪 Trying tenant ID: ${tenantId}`);
        
        const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
          email: 'admin@demo.com',
          password: 'demo123456'
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId
          }
        });

        workingTenantId = tenantId;
        console.log(`✅ Tenant ID ${tenantId} works!`);
        console.log(`   Token: ${loginResponse.data.data.token.substring(0, 50)}...\n`);
        break;
        
      } catch (error) {
        console.log(`❌ Tenant ID ${tenantId} failed:`, error.response?.data?.error?.message || error.message);
      }
    }

    if (!workingTenantId) {
      console.log('❌ No working tenant ID found. Need to check database.');
      return;
    }

    console.log('1. Testing all user logins with working tenant...\n');

    for (const user of demoUsers) {
      try {
        console.log(`🧪 Testing ${user.role}: ${user.email}`);
        
        const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
          email: user.email,
          password: user.password
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': workingTenantId
          }
        });

        const { token, user: userData } = loginResponse.data.data;
        console.log(`✅ ${user.role} login successful`);
        console.log(`   User ID: ${userData.id}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Role: ${userData.role}`);
        console.log(`   Token: ${token.substring(0, 50)}...\n`);

      } catch (error) {
        console.log(`❌ ${user.role} login failed:`, error.response?.data?.error?.message || error.message);
        console.log('');
      }
    }

    console.log('🎯 Working Tenant ID:', workingTenantId);
    console.log('===============================');
    console.log('Frontend tenant store needs to be updated to use this ID.');
    console.log('');
    console.log('🔧 Frontend Fix:');
    console.log('Update tenant store to use:', workingTenantId);
    console.log('Or update the seed to use the hardcoded tenant ID.');
    
  } catch (error) {
    console.error('❌ Check failed:', error.response?.data || error.message);
  }
}

checkUsers();
