const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const TENANT_ID = 'b18e0808-27d1-4253-aca9-453897585106';

async function createTestUsers() {
  console.log('🔧 Creating Test Users for BookEase...\n');

  try {
    // First login as admin to get token
    console.log('1. Logging in as admin...');
    const adminLogin = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@demo.com',
      password: 'demo123456'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID
      }
    });

    const adminToken = adminLogin.data.data.token;
    console.log('✅ Admin login successful\n');

    // Test different user logins
    const testUsers = [
      { email: 'admin@demo.com', password: 'demo123456', role: 'ADMIN' },
      { email: 'staff@demo.com', password: 'demo123456', role: 'STAFF' },
      { email: 'customer@demo.com', password: 'demo123456', role: 'USER' }
    ];

    console.log('2. Testing all user logins...\n');

    for (const user of testUsers) {
      try {
        console.log(`🧪 Testing ${user.role} login: ${user.email}`);
        
        const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
          email: user.email,
          password: user.password
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': TENANT_ID
          }
        });

        const { token, user: userData } = loginResponse.data.data;
        console.log(`✅ ${user.role} login successful`);
        console.log(`   User ID: ${userData.id}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Role: ${userData.role}`);
        console.log(`   Token: ${token.substring(0, 50)}...\n`);

      } catch (error) {
        console.log(`❌ ${user.role} login failed:`, error.response?.data?.error?.message || error.message);
        console.log('   This user may not exist in the database\n');
      }
    }

    console.log('🎯 Login Instructions:');
    console.log('==================');
    console.log('1. Open browser: http://localhost:5173');
    console.log('2. Go to: http://localhost:5173/login');
    console.log('3. Use these credentials:');
    console.log('');
    console.log('👑 ADMIN LOGIN:');
    console.log('   Email: admin@demo.com');
    console.log('   Password: demo123456');
    console.log('   Access: Full dashboard, all features');
    console.log('');
    console.log('👥 STAFF LOGIN:');
    console.log('   Email: staff@demo.com');
    console.log('   Password: demo123456');
    console.log('   Access: Appointments, services, limited dashboard');
    console.log('');
    console.log('🛍️ CUSTOMER LOGIN:');
    console.log('   Email: customer@demo.com');
    console.log('   Password: demo123456');
    console.log('   Access: Book appointments, view bookings');
    console.log('');
    console.log('📱 All users can access via mobile browsers!');
    console.log('🔒 Each role has different permissions and UI access');

  } catch (error) {
    console.error('❌ Setup failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 If admin login fails, you may need to:');
      console.log('1. Check if admin user exists in database');
      console.log('2. Run database seed script');
      console.log('3. Create admin user manually');
    }
  }
}

createTestUsers();
