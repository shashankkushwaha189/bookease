// API Test Script - Run in browser console
// Copy and paste this into your browser dev tools when logged in

const API_BASE = 'http://localhost:3000';
const TENANT_ID = 'b18e0808-27d1-4253-aca9-453897585106';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('bookease-auth-storage') 
    ? JSON.parse(localStorage.getItem('bookease-auth-storage')!).state.token 
    : null;
};

// Test function
const testAPI = async (endpoint, description) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': TENANT_ID,
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  try {
    console.log(`🧪 Testing: ${description}`);
    console.log(`📡 Endpoint: ${endpoint}`);
    
    const response = await fetch(`${API_BASE}${endpoint}`, { headers });
    const data = await response.json();
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Data:`, data);
    console.log('---');
    
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log('---');
    return { success: false, error: error.message };
  }
};

// Test all APIs
const testAllAPIs = async () => {
  console.log('🚀 Starting API Tests...');
  console.log('==========================');
  
  // 1. Test Health
  await testAPI('/health', 'Health Check');
  
  // 2. Test Login (without token)
  await testAPI('/api/auth/login', 'Login (POST) - Note: Needs POST method');
  
  // 3. Test Dashboard Summary
  await testAPI('/api/reports/summary?from=2026-03-03&to=2026-03-03', 'Dashboard Summary');
  
  // 4. Test Today's Appointments
  await testAPI('/api/appointments?date=2026-03-03&limit=10', 'Today\'s Appointments');
  
  // 5. Test Peak Times
  await testAPI('/api/reports/peak-times?from=2026-03-03&to=2026-03-03', 'Peak Times');
  
  // 6. Test Staff Utilization
  await testAPI('/api/reports/staff-utilization?from=2026-03-03&to=2026-03-03', 'Staff Utilization');
  
  // 7. Test Business Profile
  await testAPI('/api/business-profile', 'Business Profile');
  
  // 8. Test Services
  await testAPI('/api/services', 'Services');
  
  // 9. Test Staff
  await testAPI('/api/staff', 'Staff');
  
  console.log('🏁 API Tests Complete!');
};

// Auto-run
testAllAPIs();
