#!/usr/bin/env node

const http = require('http');

const DEMO_TENANT_ID = 'b18e0808-27d1-4253-aca9-453897585106';
const SERVICE_ID = '62c81b97-481e-41a9-a1a0-ec8dc4fa2e6f';
const STAFF_ID = '8d99ae1e-6313-4cdc-a695-816a7ac6e403';

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
  console.log('🔍 Debugging Booking Endpoint...\n');

  // Register customer
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

  const token = registerRes.body?.data?.token;
  console.log(`✅ Customer registered, token: ${token?.substring(0, 30)}...`);

  // Try booking WITHOUT auth token (public endpoint)
  console.log('\n2️⃣  Trying booking WITHOUT auth token (public endpoint)...');
  const bookingRes1 = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/public/bookings/book',
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Tenant-ID': DEMO_TENANT_ID
    }
  }, {
    serviceId: SERVICE_ID,
    staffId: STAFF_ID,
    preferredDate: '2026-03-20',
    preferredTime: '10:00',
    duration: 30,
    customerNotes: 'Test booking',
    consentGiven: true
  });

  console.log('Status:', bookingRes1.statusCode);
  console.log('Response:', JSON.stringify(bookingRes1.body, null, 2));

  // Try booking WITH auth token
  console.log('\n3️⃣  Trying booking WITH auth token...');
  const bookingRes2 = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/public/bookings/book',
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Tenant-ID': DEMO_TENANT_ID,
      'Authorization': `Bearer ${token}`
    }
  }, {
    serviceId: SERVICE_ID,
    staffId: STAFF_ID,
    preferredDate: '2026-03-20',
    preferredTime: '10:00',
    duration: 30,
    customerNotes: 'Test booking with auth',
    consentGiven: true
  });

  console.log('Status:', bookingRes2.statusCode);
  console.log('Response:', JSON.stringify(bookingRes2.body, null, 2));

  // Try /api/bookings/book (non-public)
  console.log('\n4️⃣  Trying /api/bookings/book endpoint...');
  const bookingRes3 = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/bookings/book',
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Tenant-ID': DEMO_TENANT_ID,
      'Authorization': `Bearer ${token}`
    }
  }, {
    serviceId: SERVICE_ID,
    staffId: STAFF_ID,
    preferredDate: '2026-03-20',
    preferredTime: '10:00',
    duration: 30,
    customerNotes: 'Test booking',
    consentGiven: true
  });

  console.log('Status:', bookingRes3.statusCode);
  console.log('Response:', JSON.stringify(bookingRes3.body, null, 2));
}

debug().catch(console.error);
