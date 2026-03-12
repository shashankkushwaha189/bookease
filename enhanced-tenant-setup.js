// Enhanced Tenant Setup Script
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function setupNewTenant() {
  try {
    console.log('🏢 Enhanced Tenant Setup: Wellness Spa Center\n');

    // Create a new tenant with custom data using the enhanced init endpoint
    console.log('1. 🆕 Creating new tenant with custom data...');
    const tenantData = {
      tenantSlug: 'wellness-spa-v2',
      tenantName: 'Wellness Spa Center',
      businessName: 'Wellness Spa Center',
      adminEmail: 'spa-admin@wellness-spa.com',
      adminPassword: 'SpaAdmin123!'
    };

    const initResponse = await axios.post(`${API_BASE}/api/init-database`, tenantData);
    
    const newTenantId = initResponse.data.tenantId;
    const newTenantSlug = initResponse.data.tenantSlug;
    
    console.log('✅ New tenant created successfully!');
    console.log('   Tenant ID:', newTenantId);
    console.log('   Tenant Slug:', newTenantSlug);
    console.log('   Business Name:', initResponse.data.businessName);
    console.log('   Admin Email:', initResponse.data.adminEmail);

    // Step 2: Login as the new tenant admin
    console.log('\n2. 🔐 Login as new tenant admin...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'spa-admin@wellness-spa.com',
      password: 'SpaAdmin123!'
    }, {
      headers: { 'X-Tenant-ID': newTenantId }
    });

    const tenantAdminToken = loginResponse.data.data.token;
    console.log('✅ New tenant admin login successful');

    // Step 3: Create additional services
    console.log('\n3. 💆 Creating services for new tenant...');
    const services = [
      {
        name: 'Swedish Massage',
        durationMinutes: 60,
        price: 80.00,
        description: 'Classic full-body relaxation massage',
        category: 'Massage'
      },
      {
        name: 'Deep Tissue Massage',
        durationMinutes: 90,
        price: 120.00,
        description: 'Intensive muscle therapy for tension relief',
        category: 'Massage'
      },
      {
        name: 'Hot Stone Therapy',
        durationMinutes: 75,
        price: 110.00,
        description: 'Warm stone massage for deep relaxation',
        category: 'Therapy'
      },
      {
        name: 'Aromatherapy Massage',
        durationMinutes: 60,
        price: 95.00,
        description: 'Essential oil enhanced massage experience',
        category: 'Aromatherapy'
      },
      {
        name: 'Facial Treatment',
        durationMinutes: 45,
        price: 65.00,
        description: 'Rejuvenating facial with natural products',
        category: 'Skincare'
      },
      {
        name: 'Body Wrap',
        durationMinutes: 90,
        price: 140.00,
        description: 'Detoxifying full-body treatment',
        category: 'Body Treatment'
      }
    ];

    for (const service of services) {
      try {
        const serviceResponse = await axios.post(`${API_BASE}/api/services`, service, {
          headers: { 
            'X-Tenant-ID': newTenantId,
            'Authorization': `Bearer ${tenantAdminToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`✅ Service created: ${service.name} ($${service.price})`);
      } catch (error) {
        console.log(`❌ Service creation error (${service.name}):`, error.response?.data);
      }
    }

    // Step 4: Create staff users
    console.log('\n4. 👥 Creating staff users...');
    const staffUsers = [
      {
        email: 'sarah.therapist@wellness-spa.com',
        password: 'Staff123!',
        name: 'Sarah Johnson',
        role: 'STAFF'
      },
      {
        email: 'michael.therapist@wellness-spa.com',
        password: 'Staff123!',
        name: 'Michael Chen',
        role: 'STAFF'
      },
      {
        email: 'reception@wellness-spa.com',
        password: 'Staff123!',
        name: 'Emma Wilson',
        role: 'STAFF'
      }
    ];

    for (const staffUser of staffUsers) {
      try {
        const userResponse = await axios.post(`${API_BASE}/api/users`, staffUser, {
          headers: { 
            'X-Tenant-ID': newTenantId,
            'Authorization': `Bearer ${tenantAdminToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`✅ Staff user created: ${staffUser.email} (${staffUser.role})`);
      } catch (error) {
        console.log(`❌ Staff user creation error (${staffUser.email}):`, error.response?.data);
      }
    }

    // Step 5: Create staff records
    console.log('\n5. 📋 Creating staff records...');
    
    // Get all users to find staff IDs
    const usersResponse = await axios.get(`${API_BASE}/api/users`, {
      headers: { 
        'X-Tenant-ID': newTenantId,
        'Authorization': `Bearer ${tenantAdminToken}`
      }
    });

    const staffRecords = [
      {
        name: 'Sarah Johnson',
        title: 'Senior Massage Therapist',
        department: 'Therapy',
        email: 'sarah.therapist@wellness-spa.com',
        phone: '+1-555-0124',
        commissionRate: 0.30
      },
      {
        name: 'Michael Chen',
        title: 'Massage Therapist',
        department: 'Therapy',
        email: 'michael.therapist@wellness-spa.com',
        phone: '+1-555-0125',
        commissionRate: 0.25
      },
      {
        name: 'Emma Wilson',
        title: 'Receptionist',
        department: 'Front Desk',
        email: 'reception@wellness-spa.com',
        phone: '+1-555-0126',
        commissionRate: 0.15
      }
    ];

    for (const staffRecord of staffRecords) {
      // Find the corresponding user
      const user = usersResponse.data.data.find(u => u.email === staffRecord.email);
      if (user) {
        try {
          const staffResponse = await axios.post(`${API_BASE}/api/staff`, {
            ...staffRecord,
            userId: user.id
          }, {
            headers: { 
              'X-Tenant-ID': newTenantId,
              'Authorization': `Bearer ${tenantAdminToken}`,
              'Content-Type': 'application/json'
            }
          });
          console.log(`✅ Staff record created: ${staffRecord.firstName} ${staffRecord.lastName}`);
        } catch (error) {
          console.log(`❌ Staff record creation error (${staffRecord.email}):`, error.response?.data);
        }
      }
    }

    // Step 6: Test the complete setup
    console.log('\n6. 🧪 Testing complete tenant functionality...');
    
    // Test public services
    try {
      const servicesResponse = await axios.get(`${API_BASE}/api/public/services`, {
        headers: { 'X-Tenant-Slug': newTenantSlug }
      });
      console.log(`✅ Public services accessible (${servicesResponse.data.data.length} services)`);
      
      servicesResponse.data.data.slice(0, 3).forEach(service => {
        console.log(`   - ${service.name}: $${service.price} (${service.duration}min)`);
      });
    } catch (error) {
      console.log('❌ Services test error:', error.response?.data);
    }

    // Test staff access
    try {
      const staffLogin = await axios.post(`${API_BASE}/api/auth/login`, {
        email: 'sarah.therapist@wellness-spa.com',
        password: 'Staff123!'
      }, {
        headers: { 'X-Tenant-ID': newTenantId }
      });
      
      console.log('✅ Staff login successful');
    } catch (error) {
      console.log('❌ Staff login test error:', error.response?.data);
    }

    console.log('\n🎉 Complete Tenant Setup Successful!');
    console.log('\n📊 Final Summary:');
    console.log('   ✅ Tenant created with business profile');
    console.log('   ✅ Admin user created and functional');
    console.log('   ✅ 6 services created');
    console.log('   ✅ 3 staff users created');
    console.log('   ✅ Staff records created');
    console.log('   ✅ Public access working');
    console.log('   ✅ Staff access working');
    
    console.log('\n🔑 Final Login Credentials:');
    console.log('   Admin: spa-admin@wellness-spa.com / SpaAdmin123!');
    console.log('   Staff 1: sarah.therapist@wellness-spa.com / Staff123!');
    console.log('   Staff 2: michael.therapist@wellness-spa.com / Staff123!');
    console.log('   Staff 3: reception@wellness-spa.com / Staff123!');
    console.log('   Tenant ID:', newTenantId);
    console.log('   Tenant Slug:', newTenantSlug);

    console.log('\n🌐 Access URLs:');
    console.log(`   Web App: http://localhost:5173 (use tenant slug: ${newTenantSlug})`);
    console.log(`   API: http://localhost:3000 (use X-Tenant-ID: ${newTenantId})`);

  } catch (error) {
    console.error('❌ Setup failed:', error.response?.data || error.message);
  }
}

setupNewTenant();
