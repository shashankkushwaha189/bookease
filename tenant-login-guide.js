// Tenant Login Guide - How to Access Different Tenants
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function demonstrateTenantLogin() {
  console.log('🔑 Multi-Tenant Login Guide\n');

  // Method 1: List all available tenants
  console.log('1. 📋 Listing all available tenants...');
  try {
    const tenantsResponse = await axios.get(`${API_BASE}/api/tenants/public`);
    console.log('Available tenants:');
    tenantsResponse.data.data.forEach(tenant => {
      console.log(`   - ${tenant.name} (${tenant.slug}) - ID: ${tenant.id}`);
    });
  } catch (error) {
    console.log('❌ Error listing tenants:', error.response?.data);
  }

  // Method 2: Login by Tenant ID
  console.log('\n2. 🏢 Login by Tenant ID...');
  const tenantId = 'b2934b40-378c-4736-82d1-b56a1d905858'; // Wellness Spa Center
  try {
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'spa-admin@wellness-spa.com',
      password: 'SpaAdmin123!'
    }, {
      headers: { 'X-Tenant-ID': tenantId }
    });
    console.log('✅ Login successful with Tenant ID');
    console.log(`   Tenant: ${tenantId}`);
    console.log(`   User: ${loginResponse.data.data.user.email}`);
    console.log(`   Role: ${loginResponse.data.data.user.role}`);
    console.log(`   Token: ${loginResponse.data.data.token.substring(0, 50)}...`);
  } catch (error) {
    console.log('❌ Login error:', error.response?.data);
  }

  // Method 3: Login by Tenant Slug
  console.log('\n3. 🏷️ Login by Tenant Slug...');
  const tenantSlug = 'wellness-spa-v2';
  try {
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'spa-admin@wellness-spa.com',
      password: 'SpaAdmin123!'
    }, {
      headers: { 'X-Tenant-Slug': tenantSlug }
    });
    console.log('✅ Login successful with Tenant Slug');
    console.log(`   Tenant: ${tenantSlug}`);
    console.log(`   User: ${loginResponse.data.data.user.email}`);
    console.log(`   Role: ${loginResponse.data.data.user.role}`);
  } catch (error) {
    console.log('❌ Login error:', error.response?.data);
  }

  // Method 4: Login by Tenant Domain
  console.log('\n4. 🌐 Login by Tenant Domain...');
  const tenantDomain = 'wellness-spa-v2.bookease.com';
  try {
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'spa-admin@wellness-spa.com',
      password: 'SpaAdmin123!'
    }, {
      headers: { 'X-Tenant-Domain': tenantDomain }
    });
    console.log('✅ Login successful with Tenant Domain');
    console.log(`   Domain: ${tenantDomain}`);
    console.log(`   User: ${loginResponse.data.data.user.email}`);
    console.log(`   Role: ${loginResponse.data.data.user.role}`);
  } catch (error) {
    console.log('❌ Login error:', error.response?.data);
  }

  // Method 5: Access Demo Tenant
  console.log('\n5. 🏥 Access Demo Tenant...');
  const demoTenantId = '9d6a9a2c-4d64-4167-a9ae-2f0c21f34939';
  try {
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@demo.com',
      password: 'demo123456'
    }, {
      headers: { 'X-Tenant-ID': demoTenantId }
    });
    console.log('✅ Demo tenant login successful');
    console.log(`   Tenant: ${demoTenantId}`);
    console.log(`   User: ${loginResponse.data.data.user.email}`);
    console.log(`   Role: ${loginResponse.data.data.user.role}`);
  } catch (error) {
    console.log('❌ Demo tenant login error:', error.response?.data);
  }

  console.log('\n📖 Login Methods Summary:');
  console.log('');
  console.log('🔹 By Tenant ID:');
  console.log('   Header: X-Tenant-ID: <tenant-uuid>');
  console.log('   Example: X-Tenant-ID: b2934b40-378c-4736-82d1-b56a1d905858');
  console.log('');
  console.log('🔹 By Tenant Slug:');
  console.log('   Header: X-Tenant-Slug: <tenant-slug>');
  console.log('   Example: X-Tenant-Slug: wellness-spa-v2');
  console.log('');
  console.log('🔹 By Tenant Domain:');
  console.log('   Header: X-Tenant-Domain: <tenant-domain>');
  console.log('   Example: X-Tenant-Domain: wellness-spa-v2.bookease.com');
  console.log('');
  console.log('🔹 Web Application:');
  console.log('   URL: http://localhost:5173');
  console.log('   Method: Enter tenant slug in login form or URL');
  console.log('   Example: http://localhost:5173/login?tenant=wellness-spa-v2');

  console.log('\n🎯 Available Tenants:');
  console.log('   1. Demo Clinic (demo-clinic)');
  console.log('      - Admin: admin@demo.com / demo123456');
  console.log('      - ID: 9d6a9a2c-4d64-4167-a9ae-2f0c21f34939');
  console.log('');
  console.log('   2. Wellness Spa Center (wellness-spa-v2)');
  console.log('      - Admin: spa-admin@wellness-spa.com / SpaAdmin123!');
  console.log('      - ID: b2934b40-378c-4736-82d1-b56a1d905858');
  console.log('');
  console.log('   3. Test Spa (test-spa)');
  console.log('      - Admin: test@test.com / test123');
  console.log('      - ID: 679fb5e6-0de4-4d2c-864a-b7370c28600e');
}

demonstrateTenantLogin();
