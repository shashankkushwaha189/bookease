const axios = require('axios');

async function testCustomerRegistration() {
  const tenantSlug = 'wellness-spa-v2';
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔍 Testing customer registration for Wellness Spa...');
  
  const testCustomer = {
    email: `test.customer.${Date.now()}@wellness-spa.com`,
    password: 'Customer123!',
    firstName: 'Test',
    lastName: 'Customer',
    phoneNumber: '+1234567890'
  };
  
  try {
    // Test registration
    console.log('\n📝 Testing registration...');
    const registerResponse = await axios.post(`${baseUrl}/api/auth/register`, {
      email: testCustomer.email,
      password: testCustomer.password,
      firstName: testCustomer.firstName,
      lastName: testCustomer.lastName,
      phoneNumber: testCustomer.phoneNumber,
      tenantSlug: tenantSlug
    }, {
      headers: {
        'X-Tenant-Slug': tenantSlug,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Registration SUCCESS!');
    console.log('   User:', registerResponse.data.data.user.email);
    console.log('   Role:', registerResponse.data.data.user.role);
    console.log('   Tenant:', registerResponse.data.data.user.tenantId);
    
    // Test login with new customer
    console.log('\n🔐 Testing login with new customer...');
    const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
      email: testCustomer.email,
      password: testCustomer.password
    }, {
      headers: {
        'X-Tenant-Slug': tenantSlug,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login SUCCESS!');
    console.log('   Token received:', loginResponse.data.data.token.substring(0, 50) + '...');
    
    // Test customer can access services
    console.log('\n📋 Testing customer access to services...');
    const token = loginResponse.data.data.token;
    const servicesResponse = await axios.get(`${baseUrl}/api/services`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Slug': tenantSlug,
        'X-Tenant-ID': loginResponse.data.data.user.tenantId
      }
    });
    
    console.log('✅ Customer can view services!');
    console.log(`   Available services: ${servicesResponse.data.data.length} services`);
    
    console.log('\n✅ Registration page is working perfectly!');
    console.log('   Customers can:');
    console.log('   - Register new accounts');
    console.log('   - Login successfully');
    console.log('   - Access services for booking');
    
  } catch (error) {
    console.log('❌ Registration test FAILED');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data?.error?.message);
    } else {
      console.log('   Network error:', error.message);
    }
  }
}

testCustomerRegistration();
