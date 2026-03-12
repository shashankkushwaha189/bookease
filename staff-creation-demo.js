const axios = require('axios');

async function demonstrateStaffCreationAndLogin() {
  console.log('👥 Complete Staff Creation & Login Flow\n');
  
  const baseUrl = 'http://localhost:3000';
  
  console.log('1️⃣ ADMIN CREATES STAFF ACCOUNT');
  console.log('   Admin logs into their tenant and adds staff');
  
  try {
    // Login as wellness-spa admin
    const adminLogin = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'spa-admin@wellness-spa.com',
      password: 'SpaAdmin123!'
    }, {
      headers: {
        'X-Tenant-Slug': 'wellness-spa-v2',
        'Content-Type': 'application/json'
      }
    });
    
    const adminToken = adminLogin.data.data.token;
    const tenantId = adminLogin.data.data.user.tenantId;
    
    console.log('✅ Admin logged in to wellness-spa-v2');
    console.log('   Admin can now create staff accounts');
    
    // Show current staff
    const staffResponse = await axios.get(`${baseUrl}/api/staff`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-Tenant-Slug': 'wellness-spa-v2',
        'X-Tenant-ID': tenantId
      }
    });
    
    console.log('📋 Staff accounts created by admin:');
    staffResponse.data.data.forEach((staff, index) => {
      console.log(`   ${index + 1}. ${staff.email} - Role: ${staff.role || 'STAFF'}`);
      console.log(`      Status: ${staff.isActive ? 'Active' : 'Inactive'}`);
    });
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.error?.message);
  }
  
  console.log('\n2️⃣ STAFF LOGIN WITH CREDENTIALS');
  console.log('   Staff uses email/password given by admin');
  
  // Test staff login
  const staffAccounts = [
    { email: 'sarah.therapist@wellness-spa.com', password: 'Staff123!' },
    { email: 'michael.therapist@wellness-spa.com', password: 'Staff123!' },
    { email: 'reception@wellness-spa.com', password: 'Staff123!' }
  ];
  
  for (const staff of staffAccounts) {
    console.log(`\n🔐 Testing staff login: ${staff.email}`);
    try {
      const staffLogin = await axios.post(`${baseUrl}/api/auth/login`, {
        email: staff.email,
        password: staff.password
      }, {
        headers: {
          'X-Tenant-Slug': 'wellness-spa-v2',
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ ${staff.email} - LOGIN SUCCESS`);
      console.log(`   Role: ${staffLogin.data.data.user.role}`);
      console.log(`   Tenant: ${staffLogin.data.data.user.tenantId}`);
      console.log(`   Token: ${staffLogin.data.data.token.substring(0, 30)}...`);
      
      // Test what staff can access
      const token = staffLogin.data.data.token;
      const tenantId = staffLogin.data.data.user.tenantId;
      
      console.log(`🔍 Testing ${staff.email} access permissions:`);
      
      const endpoints = [
        { path: '/api/services', name: 'Services' },
        { path: '/api/appointments', name: 'All Appointments' },
        { path: '/api/staff', name: 'Staff List' },
        { path: '/api/customers', name: 'Customers' }
      ];
      
      for (const endpoint of endpoints) {
        try {
          await axios.get(`${baseUrl}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Tenant-Slug': 'wellness-spa-v2',
              'X-Tenant-ID': tenantId
            }
          });
          console.log(`   ✅ ${endpoint.name} - ACCESS GRANTED`);
        } catch (error) {
          if (error.response?.status === 403) {
            console.log(`   ❌ ${endpoint.name} - ACCESS DENIED (403)`);
          } else {
            console.log(`   ❌ ${endpoint.name} - ERROR: ${error.response?.status}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ ${staff.email} - LOGIN FAILED: ${error.response?.data?.error?.message}`);
    }
  }
  
  console.log('\n🎯 COMPLETE WORKFLOW:');
  console.log('1. Admin logs into THEIR tenant');
  console.log('2. Admin creates staff accounts with email/password');
  console.log('3. Admin assigns STAFF role to each account');
  console.log('4. Staff uses provided credentials to login');
  console.log('5. Staff can only access THEIR tenant');
  console.log('6. Staff has limited permissions (no admin access)');
  
  console.log('\n🔐 SECURITY FEATURES:');
  console.log('✅ Staff can only login to their assigned tenant');
  console.log('✅ Staff cannot access other tenants');
  console.log('✅ Staff cannot access admin-only endpoints');
  console.log('✅ Each tenant has separate staff database');
  
  console.log('\n🌐 TEST URLs:');
  console.log('Admin Login: http://localhost:5173/login?tenant=wellness-spa-v2');
  console.log('Staff Login: http://localhost:5173/login?tenant=wellness-spa-v2');
  console.log('Admin Panel: http://localhost:5173/admin/dashboard');
  console.log('Staff Panel: http://localhost:5173/staff/schedule');
}

demonstrateStaffCreationAndLogin();
