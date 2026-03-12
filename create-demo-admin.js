const axios = require('axios');

async function createDemoAdmin() {
  try {
    console.log('🔧 Creating admin user for demo tenant...');
    
    // First login as spa admin to get a token (we know this works)
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'spa-admin@wellness-spa.com',
      password: 'SpaAdmin123!'
    }, {
      headers: { 'X-Tenant-Slug': 'wellness-spa-v2' }
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Got admin token');
    
    // Create admin user for demo tenant
    const createUserResponse = await axios.post('http://localhost:3000/api/users', {
      email: 'demo-admin@demo.com',
      password: 'DemoAdmin123!',
      name: 'Demo Admin',
      role: 'ADMIN'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Slug': 'demo-clinic'
      }
    });
    
    console.log('✅ Created admin user for demo tenant');
    console.log('   Email: demo-admin@demo.com');
    console.log('   Password: DemoAdmin123!');
    console.log('   Role: ADMIN');
    
    // Test the new admin login
    const testLogin = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'demo-admin@demo.com',
      password: 'DemoAdmin123!'
    }, {
      headers: { 'X-Tenant-Slug': 'demo-clinic' }
    });
    
    console.log('✅ New admin login successful');
    console.log('   Role:', testLogin.data.data.user.role);
    
  } catch (error) {
    console.log('❌ Error creating admin:', error.response?.data);
  }
}

createDemoAdmin();
