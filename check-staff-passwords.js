const axios = require('axios');

async function checkStaffUsers() {
  const tenantSlug = 'wellness-spa-v2';
  const baseUrl = 'http://localhost:3000';
  
  // First login as admin to get a token
  console.log('🔑 Logging in as admin to check staff users...');
  const adminLogin = await axios.post(`${baseUrl}/api/auth/login`, {
    email: 'spa-admin@wellness-spa.com',
    password: 'SpaAdmin123!'
  }, {
    headers: {
      'X-Tenant-Slug': tenantSlug,
      'Content-Type': 'application/json'
    }
  });
  
  const adminToken = adminLogin.data.data.token;
  
  // Get all staff users
  console.log('\n📋 Fetching all staff users...');
  const staffResponse = await axios.get(`${baseUrl}/api/staff`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'X-Tenant-Slug': tenantSlug,
      'X-Tenant-ID': adminLogin.data.data.user.tenantId
    }
  });
  
  console.log('✅ Staff users found:');
  staffResponse.data.data.forEach((staff, index) => {
    console.log(`${index + 1}. Email: ${staff.email}`);
    console.log(`   Name: ${staff.firstName} ${staff.lastName}`);
    console.log(`   Role: ${staff.role}`);
    console.log(`   Active: ${staff.isActive}`);
    console.log('');
  });
  
  // Test common staff passwords
  const commonPasswords = ['staff123!', 'Staff123!', 'password', '123456', 'wellness123'];
  
  for (const staff of staffResponse.data.data) {
    console.log(`🔍 Testing passwords for ${staff.email}...`);
    for (const password of commonPasswords) {
      try {
        const testLogin = await axios.post(`${baseUrl}/api/auth/login`, {
          email: staff.email,
          password: password
        }, {
          headers: {
            'X-Tenant-Slug': tenantSlug,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ SUCCESS! Password for ${staff.email} is: ${password}`);
        break;
      } catch (error) {
        if (error.response?.status === 401) {
          // Wrong password, try next
          continue;
        } else {
          console.log(`❌ Error testing ${staff.email}:`, error.response?.data?.error?.message);
          break;
        }
      }
    }
  }
}

checkStaffUsers().catch(console.error);
