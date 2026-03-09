const http = require('http');

const data = JSON.stringify({
  email: "admin@healthfirst.demo",
  password: "demo123456",
  name: "Admin User",
  role: "ADMIN"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('Creating admin user...');

const req = http.request(options, (res) => {
  console.log('Response status:', res.statusCode);
  console.log('Response body:', res.body);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Full response:', body);
    try {
      const parsed = JSON.parse(body);
      console.log('Created user:', parsed);
    } catch (e) {
      console.log('JSON parse error:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.log('Request error:', e.message);
});

req.write(data);
req.end();
