import axios from 'axios';

async function testAIAPI() {
  try {
    // First login to get token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@demo.com',
      password: 'demo123456'
    }, {
      headers: {
        'X-Tenant-ID': 'b18e0808-27d1-4253-aca9-453897585106'
      }
    });

    const token = loginResponse.data.data.token;
    console.log('Login successful, token obtained');

    // Test AI configuration
    const aiResponse = await axios.get('http://localhost:3000/api/ai/configuration', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': 'b18e0808-27d1-4253-aca9-453897585106'
      }
    });

    console.log('AI API Response:', JSON.stringify(aiResponse.data, null, 2));
    
  } catch (error: any) {
    console.log('AI API Error:', error.response?.status, error.response?.data || error.message);
  }
}

testAIAPI();
