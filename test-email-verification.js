const axios = require('axios');

async function testEmailVerification() {
  console.log('📧 Testing Email Verification System\n');
  
  const baseUrl = 'http://localhost:3000';
  
  console.log('1️⃣ Current Email Status');
  console.log('   ❌ Email not configured - verification codes logged only');
  
  console.log('\n2️⃣ What happens during registration:');
  console.log('   • User registers successfully');
  console.log('   • System generates verification code');
  console.log('   • Code is logged to console (not emailed)');
  console.log('   • User sees "check your email" message');
  console.log('   • But no email actually sent');
  
  console.log('\n3️⃣ Testing verification code generation:');
  
  try {
    // Register a test user
    const testUser = {
      firstName: 'Email',
      lastName: 'Test',
      email: `email.test.${Date.now()}@test.com`,
      password: 'EmailTest123!',
      tenantSlug: 'wellness-spa-v2',
      phoneNumber: '+1234567890'
    };
    
    const response = await axios.post(`${baseUrl}/api/auth/register`, testUser, {
      headers: {
        'X-Tenant-Slug': 'wellness-spa-v2',
        'Content-Type': 'application/json'
      }
    });
    
    const userId = response.data.data.user.id;
    const userEmail = response.data.data.user.email;
    
    console.log(`✅ Test user created: ${userEmail}`);
    console.log(`   User ID: ${userId}`);
    
    // Generate email verification code
    const verificationResponse = await axios.post(`${baseUrl}/api/auth/mfa/email/send`, {
      userId: userId,
      email: userEmail
    }, {
      headers: {
        'X-Tenant-Slug': 'wellness-spa-v2',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${response.data.data.token}`
      }
    });
    
    console.log(`✅ Verification code generated: ${verificationResponse.data.data.code}`);
    console.log('   (This would normally be emailed to the user)');
    
    console.log('\n4️⃣ QUICK FIX OPTIONS:');
    console.log('');
    console.log('Option A: Skip Email Verification (Recommended for dev)');
    console.log('   - Users can login immediately without verification');
    console.log('   - No email setup required');
    console.log('   - Perfect for development/testing');
    console.log('');
    console.log('Option B: Setup Email Service (Advanced)');
    console.log('   - Configure SMTP settings in .env');
    console.log('   - Use Gmail or Ethereal email service');
    console.log('   - Emails will actually be sent');
    console.log('');
    console.log('Option C: Use Console Verification (Current)');
    console.log('   - Check console for verification codes');
    console.log('   - Manually verify users in database');
    console.log('   - Not user-friendly');
    
    console.log('\n🎯 RECOMMENDED SOLUTION:');
    console.log('Skip email verification for development - users can login immediately');
    console.log('This is standard practice for development environments');
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.error?.message);
  }
  
  console.log('\n📋 To fix email verification:');
  console.log('1. Add SMTP credentials to .env file');
  console.log('2. Or disable email verification for development');
  console.log('3. Or use console codes for testing');
}

testEmailVerification();
