// Debug exact request being sent
const axios = require('axios');

async function debugRequest() {
  try {
    console.log('🔍 Debugging exact frontend request...\n');

    // Test 1: Exact same headers as frontend would send
    console.log('1. Testing with exact frontend headers...');
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'spa-admin@wellness-spa.com',
        password: 'SpaAdmin123!'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Slug': 'wellness-spa-v2',
          'X-Correlation-ID': 'test-debug-id'
        }
      });
      console.log('✅ SUCCESS with exact headers');
      console.log('   Status:', response.status);
      console.log('   Data:', response.data);
    } catch (error) {
      console.log('❌ FAILED with exact headers');
      console.log('   Status:', error.response?.status);
      console.log('   Data:', error.response?.data);
    }

    // Test 2: Check if there's a CORS or preflight issue
    console.log('\n2. Testing OPTIONS request...');
    try {
      const response = await axios.options('http://localhost:3000/api/auth/login', {
        headers: {
          'Origin': 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, X-Tenant-Slug'
        }
      });
      console.log('✅ OPTIONS request successful');
    } catch (error) {
      console.log('❌ OPTIONS request failed:', error.response?.status);
    }

    // Test 3: Check if the issue is with the URL path
    console.log('\n3. Testing different URL formats...');
    const urls = [
      'http://localhost:3000/api/auth/login',
      'http://localhost:3000/api/auth/login/',
      '/api/auth/login'
    ];

    for (const url of urls) {
      try {
        if (url.startsWith('/')) {
          console.log(`   Skipping relative URL: ${url}`);
          continue;
        }
        const response = await axios.post(url, {
          email: 'spa-admin@wellness-spa.com',
          password: 'SpaAdmin123!'
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-Slug': 'wellness-spa-v2'
          }
        });
        console.log(`✅ ${url} - SUCCESS`);
      } catch (error) {
        console.log(`❌ ${url} - ${error.response?.status}`);
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugRequest();
