// Quick frontend debug check
console.log('🔍 Debugging frontend login issue...');

// Check what the frontend is actually sending
const testLogin = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Slug': 'wellness-spa-v2'
      },
      body: JSON.stringify({
        email: 'spa-admin@wellness-spa.com',
        password: 'SpaAdmin123!'
      })
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Run this in browser console
testLogin();
