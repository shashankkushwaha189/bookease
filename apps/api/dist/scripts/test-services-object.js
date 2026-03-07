"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function testServicesObject() {
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
        // Test services API object structure
        const servicesResponse = await axios_1.default.get('http://localhost:3000/api/services', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Tenant-ID': 'b18e0808-27d1-4253-aca9-453897585106'
            }
        });
        console.log('Services Response Keys:', Object.keys(servicesResponse.data));
        if (servicesResponse.data.data && Array.isArray(servicesResponse.data.data)) {
            console.log('Services Array Length:', servicesResponse.data.data.length);
            if (servicesResponse.data.data.length > 0) {
                console.log('First Service ID:', servicesResponse.data.data[0].id);
                console.log('First Service Name:', servicesResponse.data.data[0].name);
            }
        }
    }
    catch (error) {
        console.log('Services Object Error:', error.response?.status, error.response?.data || error.message);
    }
}
testServicesObject();
