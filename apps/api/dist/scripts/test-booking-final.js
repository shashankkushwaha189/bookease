"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function testBookingCreation() {
    try {
        // First login to get token
        const loginResponse = await axios_1.default.post('http://localhost:3000/api/auth/login', {
            email: 'admin@demo.com',
            password: 'demo123456'
        }, {
            headers: {
                'X-Tenant-ID': 'b18e0808-27d1-4253-aca9-453897585106'
            }
        });
        const token = loginResponse.data.data.token;
        console.log('Login successful, token obtained');
        // Get a valid service ID
        const servicesResponse = await axios_1.default.get('http://localhost:3000/api/services', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Tenant-ID': 'b18e0808-27d1-4253-aca9-453897585106'
            }
        });
        if (servicesResponse.data && servicesResponse.data && servicesResponse.data.length > 0) {
            const validServiceId = servicesResponse.data[0].id;
            console.log('Using service ID:', validServiceId);
            // Test booking creation with valid service ID
            const bookingData = {
                customerEmail: 'test@example.com',
                customerName: 'Test Customer',
                startTime: new Date().toISOString(),
                serviceId: validServiceId,
                consentGiven: true
            };
            console.log('Booking data:', JSON.stringify(bookingData, null, 2));
            const bookingResponse = await axios_1.default.post('http://localhost:3000/api/public/bookings', bookingData, {
                headers: {
                    'X-Tenant-ID': 'b18e0808-27d1-4253-aca9-453897585106'
                }
            });
            console.log('Booking Response:', JSON.stringify(bookingResponse.data, null, 2));
            console.log('Booking Status:', bookingResponse.status);
        }
        else {
            console.log('No services available');
        }
    }
    catch (error) {
        console.log('Booking Creation Error:', error.response?.status, error.response?.data || error.message);
    }
}
testBookingCreation();
