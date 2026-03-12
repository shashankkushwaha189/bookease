// Complete fix for login issue
const axios = require('axios');

async function fixLoginIssue() {
  console.log('🔧 Fixing Login Issue\n');

  // Step 1: Verify API is working
  console.log('1. Verifying API works...');
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'spa-admin@wellness-spa.com',
      password: 'SpaAdmin123!'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': 'wellness-spa-v2'
      }
    });
    console.log('✅ API works perfectly');
    console.log('   Token length:', response.data.data.token.length);
    console.log('   User role:', response.data.data.user.role);
  } catch (error) {
    console.log('❌ API failed:', error.response?.data);
    return;
  }

  // Step 2: Check if there are multiple API servers
  console.log('\n2. Checking for multiple API servers...');
  const ports = [3000, 3001, 8000, 5000];
  
  for (const port of ports) {
    try {
      const response = await axios.get(`http://localhost:${port}/api/public/services`, {
        headers: { 'X-Tenant-Slug': 'wellness-spa-v2' },
        timeout: 2000
      });
      console.log(`✅ API server found on port ${port}`);
    } catch (error) {
      console.log(`❌ No API server on port ${port}`);
    }
  }

  console.log('\n3. Frontend Fix Required:');
  console.log('The API is working, but the frontend has issues. Try these steps:');
  console.log('');
  console.log('🔄 IMMEDIATE FIXES:');
  console.log('1. Hard refresh browser (Ctrl+F5)');
  console.log('2. Clear browser cache for localhost');
  console.log('3. Try incognito/private window');
  console.log('4. Restart the web server');
  console.log('');
  console.log('🔍 DEBUGGING:');
  console.log('1. Open browser dev tools (F12)');
  console.log('2. Go to Network tab');
  console.log('3. Try login and check the request');
  console.log('4. Compare headers with working API call');
  console.log('');
  console.log('⚙️  CONFIGURATION CHECK:');
  console.log('1. Check VITE_API_URL in .env file');
  console.log('2. Verify web server is pointing to correct API');
  console.log('3. Check for CORS issues');
}

fixLoginIssue();
