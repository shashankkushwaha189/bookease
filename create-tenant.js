// Create New Tenant Script
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function createTenant() {
  try {
    console.log('🏢 Creating New Tenant\n');

    // Method 1: Using API endpoint (requires authentication)
    console.log('Method 1: API Endpoint (Authenticated)');
    console.log('-------------------------------------------');
    
    // First, login as admin user
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@demo.com',
      password: 'demo123456'
    }, {
      headers: { 'X-Tenant-ID': '9d6a9a2c-4d64-4167-a9ae-2f0c21f34939' }
    });

    const adminToken = loginResponse.data.data.token;
    console.log('✅ Admin login successful');

    // Create new tenant
    const newTenant = {
      name: 'Wellness Spa Center',
      slug: 'wellness-spa',
      timezone: 'America/New_York'
    };

    console.log('\nCreating tenant:', newTenant);
    
    const tenantResponse = await axios.post(`${API_BASE}/api/tenants`, newTenant, {
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Tenant created successfully!');
    console.log('Tenant ID:', tenantResponse.data.data.id);
    console.log('Tenant Slug:', tenantResponse.data.data.slug);
    console.log('Tenant Name:', tenantResponse.data.data.name);

    // Method 2: Direct database initialization
    console.log('\n\nMethod 2: Database Initialization');
    console.log('-----------------------------------');
    console.log('Use the init endpoint to create a tenant with business profile:');
    console.log('POST /api/init-database');
    console.log('Body: { customTenantData }');

  } catch (error) {
    console.error('❌ Error creating tenant:', error.response?.data || error.message);
  }
}

// List all available methods
console.log('📋 Available Methods to Create Tenants:\n');
console.log('1. API Endpoint: POST /api/tenants (requires admin authentication)');
console.log('2. Database Init: POST /api/init-database (creates demo tenant)');
console.log('3. Direct Database: Insert into tenant table via database client');
console.log('4. Frontend Form: Through admin dashboard (when implemented)');

createTenant();
