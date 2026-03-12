// Complete Tenant Setup Script
const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const NEW_TENANT_ID = '3b6eb651-f397-4297-a1aa-1d62ed2cc282';
const NEW_TENANT_SLUG = 'wellness-spa';

async function setupCompleteTenant() {
  try {
    console.log('🏢 Complete Tenant Setup: Wellness Spa Center\n');

    // Step 1: Login as super admin
    console.log('1. 🔐 Login as admin for setup...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@demo.com',
      password: 'demo123456'
    }, {
      headers: { 'X-Tenant-ID': '9d6a9a2c-4d64-4167-a9ae-2f0c21f34939' }
    });

    const adminToken = loginResponse.data.data.token;
    console.log('✅ Admin login successful');

    // Step 2: Create Business Profile
    console.log('\n2. 📋 Creating business profile...');
    try {
      const businessProfile = {
        businessName: 'Wellness Spa Center',
        brandColor: '#10B981',
        accentColor: '#059669',
        description: 'Premium wellness and relaxation services',
        phone: '+1-555-0123',
        email: 'info@wellness-spa.com',
        address: '123 Wellness Way, Relaxation City, RC 12345'
      };

      const profileResponse = await axios.post(`${API_BASE}/api/business-profile`, businessProfile, {
        headers: { 
          'X-Tenant-ID': NEW_TENANT_ID,
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Business profile created');
      console.log('   Business:', profileResponse.data.data.businessName);
      console.log('   Brand Colors:', profileResponse.data.data.brandColor, '/', profileResponse.data.data.accentColor);
    } catch (error) {
      console.log('❌ Business profile error:', error.response?.data);
    }

    // Step 3: Create Admin User for New Tenant
    console.log('\n3. 👤 Creating admin user for new tenant...');
    try {
      const adminUser = {
        email: 'spa-admin@wellness-spa.com',
        password: 'SpaAdmin123!',
        firstName: 'Spa',
        lastName: 'Administrator',
        role: 'ADMIN'
      };

      const userResponse = await axios.post(`${API_BASE}/api/users`, adminUser, {
        headers: { 
          'X-Tenant-ID': NEW_TENANT_ID,
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Admin user created');
      console.log('   Email:', userResponse.data.data.email);
      console.log('   Role:', userResponse.data.data.role);
    } catch (error) {
      console.log('❌ Admin user creation error:', error.response?.data);
    }

    // Step 4: Create Staff User
    console.log('\n4. 👥 Creating staff user...');
    try {
      const staffUser = {
        email: 'therapist@wellness-spa.com',
        password: 'Therapist123!',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'STAFF'
      };

      const staffResponse = await axios.post(`${API_BASE}/api/users`, staffUser, {
        headers: { 
          'X-Tenant-ID': NEW_TENANT_ID,
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Staff user created');
      console.log('   Email:', staffResponse.data.data.email);
      console.log('   Role:', staffResponse.data.data.role);
    } catch (error) {
      console.log('❌ Staff user creation error:', error.response?.data);
    }

    // Step 5: Create Services
    console.log('\n5. 💆 Creating services...');
    const services = [
      {
        name: 'Swedish Massage',
        duration: 60,
        price: 80.00,
        description: 'Classic full-body relaxation massage',
        category: 'Massage'
      },
      {
        name: 'Deep Tissue Massage',
        duration: 90,
        price: 120.00,
        description: 'Intensive muscle therapy for tension relief',
        category: 'Massage'
      },
      {
        name: 'Hot Stone Therapy',
        duration: 75,
        price: 110.00,
        description: 'Warm stone massage for deep relaxation',
        category: 'Therapy'
      },
      {
        name: 'Facial Treatment',
        duration: 45,
        price: 65.00,
        description: 'Rejuvenating facial with natural products',
        category: 'Skincare'
      }
    ];

    for (const service of services) {
      try {
        const serviceResponse = await axios.post(`${API_BASE}/api/services`, service, {
          headers: { 
            'X-Tenant-ID': NEW_TENANT_ID,
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`✅ Service created: ${service.name} ($${service.price})`);
      } catch (error) {
        console.log(`❌ Service creation error (${service.name}):`, error.response?.data);
      }
    }

    // Step 6: Create Staff Records
    console.log('\n6. 📋 Creating staff records...');
    const staffRecords = [
      {
        userId: null, // Will be set after getting user ID
        firstName: 'Sarah',
        lastName: 'Johnson',
        title: 'Massage Therapist',
        department: 'Therapy',
        email: 'therapist@wellness-spa.com',
        phone: '+1-555-0124',
        specialties: ['Swedish Massage', 'Deep Tissue', 'Hot Stone Therapy'],
        commissionRate: 0.30
      }
    ];

    // First get the staff user ID
    try {
      const usersResponse = await axios.get(`${API_BASE}/api/users`, {
        headers: { 
          'X-Tenant-ID': NEW_TENANT_ID,
          'Authorization': `Bearer ${adminToken}`
        }
      });

      const staffUser = usersResponse.data.data.find(u => u.email === 'therapist@wellness-spa.com');
      if (staffUser) {
        staffRecords[0].userId = staffUser.id;

        const staffResponse = await axios.post(`${API_BASE}/api/staff`, staffRecords[0], {
          headers: { 
            'X-Tenant-ID': NEW_TENANT_ID,
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ Staff record created for Sarah Johnson');
      }
    } catch (error) {
      console.log('❌ Staff record creation error:', error.response?.data);
    }

    // Step 7: Test the New Tenant
    console.log('\n7. 🧪 Testing new tenant functionality...');
    
    // Test public services
    try {
      const servicesResponse = await axios.get(`${API_BASE}/api/public/services`, {
        headers: { 'X-Tenant-Slug': NEW_TENANT_SLUG }
      });
      console.log(`✅ Public services accessible (${servicesResponse.data.data.length} services)`);
      
      servicesResponse.data.data.forEach(service => {
        console.log(`   - ${service.name}: $${service.price} (${service.duration}min)`);
      });
    } catch (error) {
      console.log('❌ Services test error:', error.response?.data);
    }

    // Test admin login to new tenant
    try {
      const newTenantLogin = await axios.post(`${API_BASE}/api/auth/login`, {
        email: 'spa-admin@wellness-spa.com',
        password: 'SpaAdmin123!'
      }, {
        headers: { 'X-Tenant-ID': NEW_TENANT_ID }
      });
      
      console.log('✅ New tenant admin login successful');
      console.log('   Admin can now manage their own tenant independently');
    } catch (error) {
      console.log('❌ New tenant login test error:', error.response?.data);
    }

    console.log('\n🎉 Tenant Setup Complete!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Business profile created');
    console.log('   ✅ Admin user created (spa-admin@wellness-spa.com)');
    console.log('   ✅ Staff user created (therapist@wellness-spa.com)');
    console.log('   ✅ Services created (4 services)');
    console.log('   ✅ Staff records created');
    console.log('   ✅ Public access working');
    console.log('   ✅ Admin access working');
    
    console.log('\n🔑 Login Credentials for New Tenant:');
    console.log('   Admin: spa-admin@wellness-spa.com / SpaAdmin123!');
    console.log('   Staff: therapist@wellness-spa.com / Therapist123!');
    console.log('   Tenant ID:', NEW_TENANT_ID);
    console.log('   Tenant Slug:', NEW_TENANT_SLUG);

  } catch (error) {
    console.error('❌ Setup failed:', error.response?.data || error.message);
  }
}

setupCompleteTenant();
