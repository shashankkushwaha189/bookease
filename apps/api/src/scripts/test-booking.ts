import axios from 'axios';

async function testBookingCreation() {
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

    // Test booking creation with detailed logging
    const bookingData = {
      customerEmail: 'test@example.com',
      customerName: 'Test Customer',
      startTime: new Date().toISOString(),
      serviceId: 'test-service-id',
      consentGiven: true
    };

    console.log('Booking data:', JSON.stringify(bookingData, null, 2));

    const bookingResponse = await axios.post('http://localhost:3000/api/public/bookings', bookingData, {
      headers: {
        'X-Tenant-ID': 'b18e0808-27d1-4253-aca9-453897585106'
      }
    });

    console.log('Booking Response:', JSON.stringify(bookingResponse.data, null, 2));
    console.log('Booking Status:', bookingResponse.status);
    
  } catch (error: any) {
    console.log('Booking Creation Error:', error.response?.status, error.response?.data || error.message);
  }
}

testBookingCreation();
