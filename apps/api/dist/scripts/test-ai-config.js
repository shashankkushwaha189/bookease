"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function testAIConfiguration() {
    try {
        // Use the current token from the last successful verification
        const currentToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiZWU0NDJkOS1mOGJhLTQxY2QtOTg5Yy0xOTNkN2E5NzhlM2UiLCJyb2xlIjoiQURNSU4iLCJ0ZW5hbnRJZCI6ImIxOGUwODA4LTI3ZDEtNDI1My1hY2E5LTQ1Mzg5NzU4NTEwNiIsImlhdCI6MTc3Mjg3MjY2NywiZXhwIjoxNzcyODcxNjY3fQ.IGdaRdxVJGFywTw4v8TNG_BEqWc8oSXD-HiqrkXMBho';
        console.log('Testing AI configuration with current token...');
        // Test AI configuration
        const aiResponse = await axios_1.default.get('http://localhost:3000/api/ai/configuration', {
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'X-Tenant-ID': 'b18e0808-27d1-4253-aca9-453897585106'
            }
        });
        console.log('AI Configuration Response:', JSON.stringify(aiResponse.data, null, 2));
        console.log('AI Status:', aiResponse.status);
    }
    catch (error) {
        console.log('AI Configuration Error:', error.response?.status, error.response?.data || error.message);
    }
}
testAIConfiguration();
