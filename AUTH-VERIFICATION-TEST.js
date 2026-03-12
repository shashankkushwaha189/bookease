#!/usr/bin/env node

// 🔐 BookEase - Authentication & Tenant Isolation Verification

const http = require('http');

const API_BASE = 'http://localhost:3000';
const DEMO_TENANT_ID = 'b18e0808-27d1-4253-aca9-453897585106';

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
    return result;
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    testResults.failed++;
    return { success: false, message: error.message };
  }
}

// Test 1: Admin Login
async function testAdminLogin() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': DEMO_TENANT_ID
      }
    }, {
      email: 'admin@demo.com',
      password: 'demo123456'
    });
    
    if (response.statusCode === 200 && response.body?.success) {
      const data = response.body.data;
      return {
        success: true,
        message: `Admin Login successful - Role: ${data?.user?.role}, Email: ${data?.user?.email}`,
        token: data?.token,
        user: data?.user
      };
    } else {
      return {
        success: false,
        message: `Admin Login failed: ${response.body?.error?.message || 'Unknown'}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Admin Login error: ${error.message}`
    };
  }
}

// Test 2: Staff Login
async function testStaffLogin() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': DEMO_TENANT_ID
      }
    }, {
      email: 'staff@demo.com',
      password: 'demo123456'
    });
    
    if (response.statusCode === 200 && response.body?.success) {
      const data = response.body.data;
      return {
        success: true,
        message: `Staff Login successful - Role: ${data?.user?.role}, Email: ${data?.user?.email}`,
        token: data?.token
      };
    } else {
      return {
        success: false,
        message: `Staff Login failed: ${response.body?.error?.message || 'Unknown'}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Staff Login error: ${error.message}`
    };
  }
}

// Test 3: Customer Login
async function testCustomerLogin() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': DEMO_TENANT_ID
      }
    }, {
      email: 'customer@demo.com',
      password: 'demo123456'
    });
    
    if (response.statusCode === 200 && response.body?.success) {
      const data = response.body.data;
      return {
        success: true,
        message: `Customer Login successful - Role: ${data?.user?.role}, Email: ${data?.user?.email}`,
        token: data?.token
      };
    } else {
      return {
        success: false,
        message: `Customer Login failed: ${response.body?.error?.message || 'Unknown'}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Customer Login error: ${error.message}`
    };
  }
}

// Test 4: Invalid Credentials
async function testInvalidCredentials() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': DEMO_TENANT_ID
      }
    }, {
      email: 'admin@demo.com',
      password: 'wrongpassword'
    });
    
    if (response.statusCode !== 200) {
      return {
        success: true,
        message: `Correctly rejected invalid credentials (status: ${response.statusCode})`
      };
    } else {
      return {
        success: false,
        message: `Should have rejected invalid credentials`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Invalid credentials test error: ${error.message}`
    };
  }
}

// Test 5: Tenant Isolation - Different Tenant
async function testTenantIsolation() {
  try {
    const otherTenant = 'wellness-spa'; // From seeded data
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': otherTenant
      }
    }, {
      email: 'admin@demo.com',
      password: 'demo123456'
    });
    
    if (response.statusCode !== 200) {
      return {
        success: true,
        message: `Tenant isolation working - cannot login with different tenant (status: ${response.statusCode})`
      };
    } else {
      return {
        success: false,
        message: `Tenant isolation FAILED - logged in with wrong tenant`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Tenant isolation test error: ${error.message}`
    };
  }
}

// Test 6: Register New User (with consent)
async function testUserRegistration() {
  try {
    const timestamp = Date.now();
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': DEMO_TENANT_ID
      }
    }, {
      email: `testuser${timestamp}@example.com`,
      password: 'SecurePass123!',
      firstName: 'Test',
      lastName: 'User'
    });
    
    if ((response.statusCode === 201 || response.statusCode === 200) && response.body?.success) {
      return {
        success: true,
        message: `User registration successful - Email: ${response.body.data?.email}`,
        token: response.body.data?.token
      };
    } else {
      return {
        success: false,
        message: `Registration failed (status: ${response.statusCode}): ${response.body?.error?.message || 'Unknown'}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Registration error: ${error.message}`
    };
  }
}

// Test 7: Token Validation
async function testTokenValidation() {
  try {
    const loginResult = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': DEMO_TENANT_ID
      }
    }, {
      email: 'admin@demo.com',
      password: 'demo123456'
    });
    
    if (!loginResult.body?.success) {
      return {
        success: false,
        message: 'Cannot perform token validation - login failed'
      };
    }

    const token = loginResult.body.data?.token;
    
    // Try to use the token to access protected endpoint
    const protectedResult = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/services',
      method: 'GET',
      headers: {
        'X-Tenant-ID': DEMO_TENANT_ID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (protectedResult.statusCode === 200) {
      return {
        success: true,
        message: 'Token validation successful - accessed protected endpoint'
      };
    } else {
      return {
        success: false,
        message: `Token validation failed (status: ${protectedResult.statusCode})`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Token validation error: ${error.message}`
    };
  }
}

// Main test runner
async function runAllTests() {
  console.log('🔐 BookEase - Authentication & Tenant Isolation Tests');
  console.log('====================================================\n');

  await runTest('Admin Login', testAdminLogin);
  await runTest('Staff Login', testStaffLogin);
  await runTest('Customer Login', testCustomerLogin);
  await runTest('Invalid Credentials Rejection', testInvalidCredentials);
  await runTest('Tenant Isolation', testTenantIsolation);
  await runTest('User Registration', testUserRegistration);
  await runTest('Token Validation', testTokenValidation);
  
  console.log('\n====================================================');
  console.log('📊 AUTHENTICATION TEST RESULTS');
  console.log('====================================================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  
  const successRate = Math.round((testResults.passed / testResults.total) * 100);
  console.log(`Success Rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL AUTHENTICATION TESTS PASSED!');
    console.log('✅ Login system working correctly');
    console.log('✅ Tenant isolation enforced');
    console.log('✅ Registration functional');
    console.log('✅ Token validation working');
    console.log('\n🔐 Security Status: SECURE');
  } else {
    console.log('\n⚠️  Some tests failed');
    console.log('🔧 Please check the issues above');
  }
  
  console.log('\n====================================================');
}

// Start tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
