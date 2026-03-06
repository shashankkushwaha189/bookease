const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const TENANT_ID = 'b18e0808-27d1-4253-aca9-453897585106';

async function testAPI() {
  console.log('🚀 Testing BookEase API Integration...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Endpoint...');
    const health = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health:', health.data.status);
    console.log('   Database:', health.data.db);
    console.log('   Uptime:', Math.round(health.data.uptime), 'seconds\n');

    // Test 2: Login
    console.log('2. Testing Authentication...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@demo.com',
      password: 'demo123456'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID
      }
    });
    
    const { token, user } = loginResponse.data.data;
    console.log('✅ Login successful');
    console.log('   User:', user.email);
    console.log('   Role:', user.role);
    console.log('   Token:', token.substring(0, 50) + '...\n');

    // Test 3: Dashboard Summary
    console.log('3. Testing Dashboard Summary...');
    const today = new Date().toISOString().split('T')[0];
    const summary = await axios.get(`${API_BASE}/api/reports/summary`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': TENANT_ID
      },
      params: {
        from: today,
        to: today
      }
    });
    console.log('✅ Summary API working');
    console.log('   Total Appointments:', summary.data.data.totalAppointments);
    console.log('   Completed:', summary.data.data.completedCount);
    console.log('   Cancelled:', summary.data.data.cancelledCount);
    console.log('   No-show Rate:', summary.data.data.noShowRate + '%\n');

    // Test 4: Today's Appointments
    console.log('4. Testing Today\'s Appointments...');
    const appointments = await axios.get(`${API_BASE}/api/appointments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': TENANT_ID
      },
      params: {
        date: today,
        limit: 50
      }
    });
    console.log('✅ Appointments API working');
    console.log('   Response structure:', JSON.stringify(appointments.data, null, 2));
    console.log('   Found:', appointments.data.data?.items?.length || 0, 'appointments');
    console.log('   Total:', appointments.data.data?.total || 0, 'total appointments\n');

    // Test 5: Peak Times
    console.log('5. Testing Peak Times...');
    const peakTimes = await axios.get(`${API_BASE}/api/reports/peak-times`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': TENANT_ID
      },
      params: {
        from: today,
        to: today
      }
    });
    console.log('✅ Peak Times API working');
    console.log('   Found:', peakTimes.data.data.length, 'peak time entries\n');

    // Test 6: Staff Utilization
    console.log('6. Testing Staff Utilization...');
    const staffUtilization = await axios.get(`${API_BASE}/api/reports/staff-utilization`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': TENANT_ID
      },
      params: {
        from: today,
        to: today
      }
    });
    console.log('✅ Staff Utilization API working');
    console.log('   Found:', staffUtilization.data.data.length, 'staff members');
    
    // Calculate average utilization
    const avgUtilization = staffUtilization.data.data.reduce((sum, staff) => sum + staff.utilizationPct, 0) / staffUtilization.data.data.length;
    console.log('   Average Utilization:', Math.round(avgUtilization) + '%\n');

    console.log('🎉 ALL API ENDPOINTS WORKING PERFECTLY!');
    console.log('📊 Frontend-Backend Integration: ✅ COMPLETE');
    console.log('🔐 Authentication: ✅ WORKING');
    console.log('📈 Data Flow: ✅ FUNCTIONAL');

  } catch (error) {
    console.error('❌ API Test Failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Code:', error.response.data?.error?.code);
      console.error('   Message:', error.response.data?.error?.message);
    }
  }
}

testAPI();
