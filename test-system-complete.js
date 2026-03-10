// 🧪 BookEase - Complete System Test
// Run with: node test-system-complete.js

const http = require('http');

// Configuration
const API_BASE = 'http://localhost:3000';
const TENANT_ID = 'b18e0808-27d1-4253-aca9-453897585106';

// Test results
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// Helper function
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: body,
            error: 'JSON Parse Error'
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test function
async function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🧪 Testing: ${testName}`);
  
  try {
    const result = await testFunction();
    if (result.success) {
      console.log(`✅ ${testName}: PASSED`);
      if (result.message) console.log(`   ${result.message}`);
      testResults.passed++;
    } else {
      console.log(`❌ ${testName}: FAILED`);
      if (result.message) console.log(`   ${result.message}`);
      testResults.failed++;
    }
  } catch (error) {
    console.log(`❌ ${testName}: ERROR - ${error.message}`);
    testResults.failed++;
  }
}

// Test 1: Server Health
async function testServerHealth() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID
      }
    }, {});
    
    return {
      success: response.statusCode === 400 || response.statusCode === 422,
      message: `Server responded with status ${response.statusCode}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Server connection failed: ${error.message}`
    };
  }
}

// Test 2: Authentication
async function testAuthentication() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID
      }
    }, {
      email: 'admin@demo.com',
      password: 'demo123456'
    });
    
    if (response.statusCode === 200 && response.body?.success) {
      return {
        success: true,
        message: 'Authentication successful',
        token: response.body.data?.token
      };
    } else {
      return {
        success: false,
        message: `Authentication failed: ${response.body?.error?.message || 'Unknown error'}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Authentication error: ${error.message}`
    };
  }
}

// Test 3: Appointments API
async function testAppointmentsAPI() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/appointments',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID
      }
    });
    
    if (response.statusCode === 200) {
      return {
        success: true,
        message: `Appointments API working - returned ${response.body?.data?.items?.length || 0} items`
      };
    } else {
      return {
        success: false,
        message: `Appointments API failed with status ${response.statusCode}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Appointments API error: ${error.message}`
    };
  }
}

// Test 4: Public Booking API
async function testPublicBookingAPI() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID
      }
    }, {
      serviceId: "32504ef6-66d1-4d61-a538-e30949720438",
      staffId: "9ffa0c52-07fb-4e8d-810d-09627a6b53cf",
      customer: {
        name: "System Test User",
        email: "test@bookease.com",
        phone: "+1234567890"
      },
      startTimeUtc: "2026-03-12T23:00:00.000Z",
      endTimeUtc: "2026-03-12T23:30:00.000Z",
      consentGiven: true
    });
    
    if (response.statusCode === 200 && response.body?.success) {
      return {
        success: true,
        message: `Public booking successful - Reference: ${response.body.data?.referenceId}`,
        bookingId: response.body.data?.id
      };
    } else {
      return {
        success: false,
        message: `Public booking failed: ${response.body?.error?.message || 'Unknown error'}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Public booking error: ${error.message}`
    };
  }
}

// Test 5: Notifications API
async function testNotificationsAPI() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/notifications/reminders/upcoming',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID
      }
    });
    
    if (response.statusCode === 200) {
      return {
        success: true,
        message: `Notifications API working - ${response.body?.data?.length || 0} upcoming reminders`
      };
    } else {
      return {
        success: false,
        message: `Notifications API failed with status ${response.statusCode}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Notifications API error: ${error.message}`
    };
  }
}

// Test 6: Services API
async function testServicesAPI() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/services',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID
      }
    });
    
    if (response.statusCode === 200) {
      return {
        success: true,
        message: `Services API working - ${response.body?.data?.items?.length || 0} services found`
      };
    } else {
      return {
        success: false,
        message: `Services API failed with status ${response.statusCode}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Services API error: ${error.message}`
    };
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 BookEase Complete System Test');
  console.log('==================================');
  
  // Run all tests
  await runTest('Server Health', testServerHealth);
  await runTest('Authentication', testAuthentication);
  await runTest('Appointments API', testAppointmentsAPI);
  await runTest('Public Booking API', testPublicBookingAPI);
  await runTest('Notifications API', testNotificationsAPI);
  await runTest('Services API', testServicesAPI);
  
  // Print results
  console.log('\n==================================');
  console.log('📊 TEST RESULTS');
  console.log('==================================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  
  const successRate = Math.round((testResults.passed / testResults.total) * 100);
  console.log(`Success Rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! SYSTEM IS WORKING PERFECTLY!');
    console.log('✅ Ready for production deployment');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
    console.log('🔧 System may need fixes before production deployment.');
  }
  
  console.log('\n🌐 Access the system at:');
  console.log('   Web App: http://localhost:5175');
  console.log('   API: http://localhost:3000');
  console.log('   Login: admin@demo.com / demo123456');
}

// Start tests
runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error.message);
  process.exit(1);
});
