"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function testWithCachedToken() {
    try {
        // Try using the last known good token (if available)
        const cachedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiZWU0NDJkOS1mOGJhLTQxY2QtOTg5Yy0xOTNkN2E5NzhlM2UiLCJyb2xlIjoiQURNSU4iLCJ0ZW5hbnRJZCI6ImIxOGUwODA4LTI3ZDEtNDI1My1hY2E5LTQ1Mzg5NzU4NTEwNiIsImlhdCI6MTc3Mjg3MjY2NywiZXhwIjoxNzcyODcxNjY3fQ.IGdaRdxVJGFywTw4v8TNG_BEqWc8oSXD-HiqrkXMBho';
        // Test the token
        const testResponse = await axios_1.default.get('http://localhost:3000/api/services', {
            headers: {
                'Authorization': `Bearer ${cachedToken}`,
                'X-Tenant-ID': 'b18e0808-27d1-4253-aca9-453897585106'
            }
        });
        console.log('Token is valid! Services API Response:', JSON.stringify(testResponse.data, null, 2));
    }
    catch (error) {
        console.log('Token test failed:', error.response?.status, error.response?.data || error.message);
    }
}
testWithCachedToken();
