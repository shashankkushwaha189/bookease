const axios = require('axios');

async function findDemoAdmin() {
  // Try to find a real admin user for demo tenant
  const possibleAdmins = [
    { email: 'admin@demo.com', password: 'demo123456' },
    { email: 'superadmin@demo.com', password: 'demo123456' },
    { email: 'demo@demo.com', password: 'demo123456' }
  ];

  for (const user of possibleAdmins) {
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email: user.email,
        password: user.password
      }, {
        headers: { 'X-Tenant-Slug': 'demo-clinic' }
      });
      console.log(`✅ Found user: ${user.email} - Role: ${response.data.data.user.role}`);
      if (response.data.data.user.role === 'ADMIN') {
        console.log(`🎯 This is the admin user!`);
        return user;
      }
    } catch (error) {
      console.log(`❌ Failed: ${user.email}`);
    }
  }
  
  console.log('❌ No admin user found for demo tenant');
  console.log('💡 Solution: Create an admin user or use wellness-spa-v2 tenant');
}

findDemoAdmin();
