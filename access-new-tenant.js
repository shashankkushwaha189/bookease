// Access New Tenant Demo
const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const NEW_TENANT_ID = '3b6eb651-f397-4297-a1aa-1d62ed2cc282';
const NEW_TENANT_SLUG = 'wellness-spa';

async function accessNewTenant() {
  try {
    console.log('🔑 Accessing New Tenant: Wellness Spa Center\n');

    // Method 1: Access by Tenant ID
    console.log('1. Access by Tenant ID:');
    console.log('X-Tenant-ID:', NEW_TENANT_ID);
    
    try {
      const response = await axios.get(`${API_BASE}/api/public/services`, {
        headers: { 'X-Tenant-ID': NEW_TENANT_ID }
      });
      console.log('✅ Access successful by Tenant ID');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️  No services yet (expected for new tenant)');
      } else {
        console.log('❌ Error:', error.response?.data);
      }
    }

    // Method 2: Access by Tenant Slug
    console.log('\n2. Access by Tenant Slug:');
    console.log('X-Tenant-Slug:', NEW_TENANT_SLUG);
    
    try {
      const response = await axios.get(`${API_BASE}/api/public/services`, {
        headers: { 'X-Tenant-Slug': NEW_TENANT_SLUG }
      });
      console.log('✅ Access successful by Tenant Slug');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️  No services yet (expected for new tenant)');
      } else {
        console.log('❌ Error:', error.response?.data);
      }
    }

    // Method 3: Public tenant info
    console.log('\n3. Get Public Tenant Info:');
    try {
      const response = await axios.get(`${API_BASE}/api/tenants/public/slug/${NEW_TENANT_SLUG}`);
      console.log('✅ Tenant Info:', response.data.data);
    } catch (error) {
      console.log('❌ Error:', error.response?.data);
    }

    console.log('\n📋 Next Steps for New Tenant:');
    console.log('1. Create business profile');
    console.log('2. Create admin user for this tenant');
    console.log('3. Add services and staff');
    console.log('4. Configure booking settings');

  } catch (error) {
    console.error('❌ Error accessing tenant:', error.response?.data || error.message);
  }
}

accessNewTenant();
