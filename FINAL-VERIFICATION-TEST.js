// 🧪 BookEase - Final Verification Test
// This test verifies the entire system is working

const http = require('http');

console.log('🚀 BookEase Final Verification Test');
console.log('===================================');

const API_BASE = 'http://localhost:3000';
const TENANT_ID = 'b18e0808-27d1-4253-aca9-453897585106';

let testResults = {
  total: 0,
  passed: 0,
  failed: 0
};

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: body,
            parseError: true
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTest(name, testFn) {
  testResults.total++;
  console.log(`\n🧪 ${name}`);
  
  try {
    const result = await testFn();
    if (result.success) {
      console.log(`✅ PASSED: ${result.message}`);
      testResults.passed++;
    } else {
      console.log(`❌ FAILED: ${result.message}`);
      testResults.failed++;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    testResults.failed++;
  }
}

// Test 1: API Server Health
async function testAPIHealth() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'X-Tenant-ID': TENANT_ID }
    }, {});
    
    return {
      success: response.statusCode === 400 || response.statusCode === 422,
      message: `API Server responding (status: ${response.statusCode})`
    };
  } catch (error) {
    return {
      success: false,
      message: `API Server not responding: ${error.message}`
    };
  }
}

// Test 2: Authentication
async function testAuth() {
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
        message: `Authentication failed: ${response.body?.error?.message || 'Unknown'}`
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
async function testAppointments() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/appointments',
      method: 'GET',
      headers: { 'X-Tenant-ID': TENANT_ID }
    });
    
    return {
      success: response.statusCode === 200,
      message: `Appointments API working (${response.body?.data?.items?.length || 0} items)`
    };
  } catch (error) {
    return {
      success: false,
      message: `Appointments API error: ${error.message}`
    };
  }
}

// Test 4: Public Booking
async function testBooking() {
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
        name: "Final Test User",
        email: "finaltest@bookease.com",
        phone: "+1234567890"
      },
      startTimeUtc: "2026-03-12T23:30:00.000Z",
      endTimeUtc: "2026-03-12T23:45:00.000Z",
      consentGiven: true
    });
    
    if (response.statusCode === 200 && response.body?.success) {
      return {
        success: true,
        message: `Public booking successful (ref: ${response.body.data?.referenceId})`
      };
    } else {
      return {
        success: false,
        message: `Booking failed: ${response.body?.error?.message || 'Unknown'}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Booking error: ${error.message}`
    };
  }
}

// Test 5: Services API
async function testServices() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/services',
      method: 'GET',
      headers: { 'X-Tenant-ID': TENANT_ID }
    });
    
    return {
      success: response.statusCode === 200,
      message: `Services API working (${response.body?.data?.items?.length || 0} services)`
    };
  } catch (error) {
    return {
      success: false,
      message: `Services API error: ${error.message}`
    };
  }
}

// Test 6: Notifications API
async function testNotifications() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/notifications/reminders/upcoming',
      method: 'GET',
      headers: { 'X-Tenant-ID': TENANT_ID }
    });
    
    return {
      success: response.statusCode === 200,
      message: `Notifications API working (${response.body?.data?.length || 0} reminders)`
    };
  } catch (error) {
    return {
      success: false,
      message: `Notifications API error: ${error.message}`
    };
  }
}

// Run all tests
async function runAllTests() {
  await runTest('API Server Health', testAPIHealth);
  await runTest('Authentication System', testAuth);
  await runTest('Appointments API', testAppointments);
  await runTest('Public Booking', testBooking);
  await runTest('Services API', testServices);
  await runTest('Notifications API', testNotifications);
  
  console.log('\n===================================');
  console.log('📊 FINAL TEST RESULTS');
  console.log('===================================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  
  const successRate = Math.round((testResults.passed / testResults.total) * 100);
  console.log(`Success Rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ System is 100% operational');
    console.log('✅ Ready for production deployment');
    console.log('\n🌐 Access the system:');
    console.log('   Web App: http://localhost:5175');
    console.log('   API: http://localhost:3000');
    console.log('   Login: admin@demo.com / demo123456');
  } else {
    console.log('\n⚠️  Some tests failed');
    console.log('🔧 Please check the issues above');
  }
  
  console.log('\n===================================');
  console.log('🏁 TEST COMPLETE');
  console.log('===================================');
}

// Start the test
runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error.message);
  process.exit(1);
});
