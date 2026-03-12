const axios = require('axios');

async function testCustomerEndpoints() {
  console.log('🔍 Testing Customer-Specific Endpoints\n');
  
  const baseUrl = 'http://localhost:3000';
  
  // Login as a customer
  try {
    const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'happy.customer.1773318001182@test.com',
      password: 'HappyCustomer123!'
    }, {
      headers: {
        'X-Tenant-Slug': 'wellness-spa-v2',
        'Content-Type': 'application/json'
      }
    });
    
    const token = loginResponse.data.data.token;
    const tenantId = loginResponse.data.data.user.tenantId;
    const customerId = loginResponse.data.data.user.id;
    
    console.log('✅ Customer logged in successfully');
    console.log('   Customer ID:', customerId);
    console.log('   Tenant ID:', tenantId);
    
    console.log('\n🧪 Testing different endpoints for customer bookings:');
    
    const endpoints = [
      { path: '/api/appointments', name: 'Admin Appointments (should fail)' },
      { path: '/api/customer/appointments', name: 'Customer Appointments' },
      { path: '/api/customers/appointments', name: 'Customers Appointments' },
      { path: '/api/bookings', name: 'Bookings' },
      { path: '/api/customer/bookings', name: 'Customer Bookings' },
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${baseUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Slug': 'wellness-spa-v2',
            'X-Tenant-ID': tenantId
          },
          params: {
            customerId: customerId,
            fromDate: '2026-03-12',
            limit: 50
          }
        });
        
        console.log(`✅ ${endpoint.name} - SUCCESS (${response.data.data?.length || 0} items)`);
        
      } catch (error) {
        if (error.response?.status === 403) {
          console.log(`❌ ${endpoint.name} - 403 Forbidden (expected for admin endpoints)`);
        } else if (error.response?.status === 404) {
          console.log(`❌ ${endpoint.name} - 404 Not Found (endpoint doesn't exist)`);
        } else {
          console.log(`❌ ${endpoint.name} - ${error.response?.status} (${error.response?.data?.error?.message})`);
        }
      }
    }
    
    console.log('\n🎯 SOLUTION NEEDED:');
    console.log('The CustomerBookingsPage needs to use a customer-specific endpoint.');
    console.log('Currently it uses /api/appointments which is admin-only.');
    console.log('We need either:');
    console.log('1. A customer-specific endpoint like /api/customer/appointments');
    console.log('2. Or modify the appointments endpoint to allow customer access');
    console.log('3. Or create a customer bookings endpoint');
    
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.error?.message);
  }
}

testCustomerEndpoints();
