const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Get seeded data
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-clinic' }
    });
    
    const service = await prisma.service.findFirst({
      where: { tenantId: tenant.id }
    });
    
    const staff = await prisma.staff.findFirst({
      where: { tenantId: tenant.id }
    });
    
    console.log('Seeded IDs:');
    console.log(`Tenant ID: ${tenant.id}`);
    console.log(`Service ID: ${service?.id ||'NOT FOUND'}`);
    console.log(`Staff ID: ${staff?.id || 'NOT FOUND'}`);
    
    // Test API endpoints
    console.log('\n\nTesting API Endpoints...\n');
    
    // Test 1: Health
    testEndpoint('/health', {});
    
    // Test 2: Tenants public
    await new Promise(r => setTimeout(r, 500));
    testEndpoint('/api/tenants/public', {});
    
    // Test 3: Auth
    await new Promise(r => setTimeout(r, 500));
    testEndpoint('/api/auth/login', 
      { email: 'admin@demo.com', password: 'demo123456' },
      { 'X-Tenant-ID': tenant.id }
    );
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

function testEndpoint(path, body, headers = {}) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: body && Object.keys(body).length > 0 ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`✓ ${options.method} ${path} - Status ${res.statusCode}`);
          if (res.statusCode !== 200) {
            console.log(`  Error: ${parsed.error?.message || 'Unknown'}`);
          } else {
            if (parsed.data?.length !== undefined) {
              console.log(`  Data count: ${parsed.data.length}`);
            }
          }
        } catch (e) {
          console.log(`✗ ${options.method} ${path} - Parse error`);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`✗ ${options.method} ${path} - ${e.code}`);
      resolve();
    });

    if (body && Object.keys(body).length > 0) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

main();
