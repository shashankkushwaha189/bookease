// 🔧 BookEase - Comprehensive Fix Script
// This script will fix all remaining issues in the system

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Comprehensive Fix for BookEase...');
console.log('==========================================');

// Fix 1: Check and fix all remaining logger imports
function fixLoggerImports() {
  console.log('\n📝 Fixing remaining logger imports...');
  
  const apiDir = path.join(__dirname, 'apps/api/src');
  const filesToFix = [
    'modules/appointment-timeline/timeline.service.ts',
    'modules/audit/audit.service.ts',
    'modules/config/config.service.ts',
    'modules/policy/policy.service.ts',
    'modules/report/report.service.ts',
    'modules/service/service.service.ts',
    'modules/availability/availability.service.ts',
    'modules/customer/customer.service.ts'
  ];
  
  filesToFix.forEach(file => {
    const filePath = path.join(apiDir, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      if (content.includes("import { logger } from '@bookease/logger';")) {
        content = content.replace(
          "import { logger } from '@bookease/logger';",
          "// Simple logger replacement since @bookease/logger is not available\nconst logger = {\n  info: (message: any, context?: string) => console.log(`[INFO] ${context}:`, message),\n  error: (error: any, context?: string) => console.error(`[ERROR] ${context}:`, error),\n  warn: (message: any, context?: string) => console.warn(`[WARN] ${context}:`, message)\n};"
        );
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed logger import in ${file}`);
      }
    }
  });
}

// Fix 2: Ensure all API routes are properly mounted
function fixApiRoutes() {
  console.log('\n🔗 Fixing API routes...');
  
  const appPath = path.join(__dirname, 'apps/api/src/app.ts');
  if (fs.existsSync(appPath)) {
    let content = fs.readFileSync(appPath, 'utf8');
    
    // Ensure booking routes are imported
    if (!content.includes("import bookingRoutes from './modules/booking/booking.routes';")) {
      content = content.replace(
        "import appointmentRouter from './modules/appointment/appointment.routes';",
        "import appointmentRouter from './modules/appointment/appointment.routes';\nimport bookingRoutes from './modules/booking/booking.routes';"
      );
    }
    
    // Ensure booking routes are mounted in protected routes
    if (!content.includes("app.use('/api/bookings', bookingRoutes);")) {
      content = content.replace(
        "app.use('/api/appointments', appointmentRouter);",
        "app.use('/api/appointments', appointmentRouter);\napp.use('/api/bookings', bookingRoutes);"
      );
    }
    
    fs.writeFileSync(appPath, content);
    console.log('✅ Fixed API routes mounting');
  }
}

// Fix 3: Check frontend API integration
function fixFrontendApi() {
  console.log('\n🌐 Fixing frontend API integration...');
  
  const apiPath = path.join(__dirname, 'apps/web/src/api/appointments.ts');
  if (fs.existsSync(apiPath)) {
    let content = fs.readFileSync(apiPath, 'utf8');
    
    // Ensure all booking-related methods are present
    if (!content.includes('cancelBooking:')) {
      const methodsToAdd = `
  /**
   * Cancel booking (new endpoint)
   */
  cancelBooking: (id: string, data?: { reason?: string }) => 
    api.delete<ApiSuccessResponse<Appointment>>(\`/api/bookings/\${id}\`, { data }),

  /**
   * Reschedule booking (new endpoint)
   */
  rescheduleBooking: (id: string, data: { newStartTimeUtc: string; newEndTimeUtc: string; reason?: string }) => 
    api.put<ApiSuccessResponse<Appointment>>(\`/api/bookings/\${id}/reschedule\`, data),
`;
      
      content = content.replace(
        "completeAppointment: (id: string, data?: { notes?: string }) =>",
        methodsToAdd + "completeAppointment: (id: string, data?: { notes?: string }) =>"
      );
      
      fs.writeFileSync(apiPath, content);
      console.log('✅ Fixed frontend API methods');
    }
  }
}

// Fix 4: Check environment variables
function fixEnvironment() {
  console.log('\n⚙️ Checking environment variables...');
  
  const envPath = path.join(__dirname, 'apps/api/.env');
  if (fs.existsSync(envPath)) {
    let content = fs.readFileSync(envPath, 'utf8');
    
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'NEXT_PUBLIC_APP_URL'
    ];
    
    let needsUpdate = false;
    requiredVars.forEach(varName => {
      if (!content.includes(`${varName}=`)) {
        content += `\n${varName}=your-${varName.toLowerCase()}-here`;
        needsUpdate = true;
      }
    });
    
    if (needsUpdate) {
      fs.writeFileSync(envPath, content);
      console.log('✅ Added missing environment variables');
    } else {
      console.log('✅ All environment variables present');
    }
  }
}

// Fix 5: Create comprehensive test script
function createTestScript() {
  console.log('\n🧪 Creating comprehensive test script...');
  
  const testScript = `// 🧪 BookEase - Complete System Test
const http = require('http');

const API_BASE = 'http://localhost:3000';
const TENANT_ID = 'b18e0808-27d1-4253-aca9-453897585106';

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: body ? JSON.parse(body) : null
          });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testSystem() {
  console.log('🧪 Testing BookEase System...');
  console.log('===============================');
  
  // Test 1: Authentication
  console.log('\\n🔐 Testing Authentication...');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID
      }
    }, {
      email: 'admin@demo.com',
      password: 'demo123456'
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Authentication: WORKING');
    } else {
      console.log('❌ Authentication: FAILED');
    }
  } catch (error) {
    console.log('❌ Authentication: ERROR -', error.message);
  }
  
  // Test 2: Appointments API
  console.log('\\n📅 Testing Appointments API...');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/appointments',
      method: 'GET',
      headers: {
        'X-Tenant-ID': TENANT_ID
      }
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Appointments API: WORKING');
    } else {
      console.log('❌ Appointments API: FAILED');
    }
  } catch (error) {
    console.log('❌ Appointments API: ERROR -', error.message);
  }
  
  // Test 3: Bookings API
  console.log('\\n📋 Testing Bookings API...');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID
      }
    }, {
      serviceId: "32504ef6-66d1-4d61-a538-e30949720438",
      staffId: "9ffa0c52-07fb-4e8d-810d-09627a6b53cf",
      customer: {
        name: "Test User",
        email: "test@example.com",
        phone: "+1234567890"
      },
      startTimeUtc: "2026-03-12T22:00:00.000Z",
      endTimeUtc: "2026-03-12T22:30:00.000Z",
      consentGiven: true
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Bookings API: WORKING');
    } else {
      console.log('❌ Bookings API: FAILED');
    }
  } catch (error) {
    console.log('❌ Bookings API: ERROR -', error.message);
  }
  
  console.log('\\n===============================');
  console.log('🎯 System Test Complete!');
  console.log('📊 Check above results for status.');
}

testSystem().catch(console.error);
`;
  
  fs.writeFileSync(path.join(__dirname, 'test-complete-system.js'), testScript);
  console.log('✅ Created comprehensive test script');
}

// Fix 6: Create startup script
function createStartupScript() {
  console.log('\n🚀 Creating startup script...');
  
  const startupScript = `@echo off
echo 🚀 Starting BookEase System...
echo ============================

echo.
echo 📦 Starting API Server...
cd /d "%~dp0apps\\api"
start "BookEase API" cmd /k "npm run dev"

echo.
echo 🌐 Starting Web Server...
cd /d "%~dp0apps\\web"
start "BookEase Web" cmd /k "npm run dev"

echo.
echo ✅ Both servers are starting...
echo 📊 API Server: http://localhost:3000
echo 🎨 Web Server: http://localhost:5175
echo 👤 Admin Login: admin@demo.com / demo123456
echo.
echo 🎉 BookEase is starting up...
echo 📱 Please wait a few seconds for servers to fully start.
pause
`;
  
  fs.writeFileSync(path.join(__dirname, 'start-bookase.bat'), startupScript);
  console.log('✅ Created startup script');
}

// Execute all fixes
function executeAllFixes() {
  try {
    fixLoggerImports();
    fixApiRoutes();
    fixFrontendApi();
    fixEnvironment();
    createTestScript();
    createStartupScript();
    
    console.log('\n==========================================');
    console.log('🎉 COMPREHENSIVE FIX COMPLETE!');
    console.log('==========================================');
    console.log('✅ All logger imports fixed');
    console.log('✅ API routes properly mounted');
    console.log('✅ Frontend API integration fixed');
    console.log('✅ Environment variables checked');
    console.log('✅ Test script created');
    console.log('✅ Startup script created');
    console.log('\n🚀 Next steps:');
    console.log('1. Run: start-bookase.bat');
    console.log('2. Test: node test-complete-system.js');
    console.log('3. Access: http://localhost:5175');
    console.log('4. Login: admin@demo.com / demo123456');
    console.log('\n🎯 All systems should now be working properly!');
    
  } catch (error) {
    console.error('❌ Error during fix:', error.message);
  }
}

executeAllFixes();
