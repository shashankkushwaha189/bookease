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

async function debug() {
  console.log('🔍 Debugging Customer Registration Flow...\n');

  // Step 1: Register customer
  console.log('1️⃣  Registering customer...');
  const timestamp = Date.now();
  const registerRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Tenant-ID': DEMO_TENANT_ID
    }
  }, {
    email: `customer${timestamp}@example.com`,
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe'
  });

  console.log('Registration Response:', JSON.stringify(registerRes.body, null, 2));
  const token = registerRes.body?.data?.token;
  const user = registerRes.body?.data?.user;

  if (!token) {
    console.log('❌ No token received!');
    return;
  }

  console.log(`\n✅ Token: ${token.substring(0, 50)}...`);
  console.log(`User Object:`, JSON.stringify(user, null, 2));

  // Step 2: Check /api/auth/me
  console.log('\n2️⃣  Checking /api/auth/me endpoint...');
  const meRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 
      'X-Tenant-ID': DEMO_TENANT_ID,
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Me Response:', JSON.stringify(meRes.body, null, 2));

  // Step 3: Try /api/services
  console.log('\n3️⃣  Checking /api/services endpoint...');
  const servicesRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/services',
    method: 'GET',
    headers: { 
      'X-Tenant-ID': DEMO_TENANT_ID,
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Services Response Status:', servicesRes.statusCode);
  console.log('Services Response:', JSON.stringify(servicesRes.body, null, 2));

  // Step 4: Try /api/staff
  console.log('\n4️⃣  Checking /api/staff endpoint...');
  const staffRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/staff',
    method: 'GET',
    headers: { 
      'X-Tenant-ID': DEMO_TENANT_ID,
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Staff Response Status:', staffRes.statusCode);
  console.log('Staff Response:', JSON.stringify(staffRes.body, null, 2));

  // Step 5: Try /api/appointments
  console.log('\n5️⃣  Checking /api/appointments endpoint...');
  const appointmentsRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/appointments',
    method: 'GET',
    headers: { 
      'X-Tenant-ID': DEMO_TENANT_ID,
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Appointments Response Status:', appointmentsRes.statusCode);
  console.log('Appointments Response:', JSON.stringify(appointmentsRes.body, null, 2));
}

debug().catch(console.error);
