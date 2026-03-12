#!/usr/bin/env node

const http = require('http');

const DEMO_TENANT_ID = 'b18e0808-27d1-4253-aca9-453897585106';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : body
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
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

async function testRegistration() {
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
    
    console.log('📋 Registration Response Details:');
    console.log('Status Code:', response.statusCode);
    console.log('Response Body:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRegistration();
