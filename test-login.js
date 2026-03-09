const http = require('http');

const data = JSON.stringify({
  email: "admin@healthfirst.demo",
  password: "demo123456"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/users/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('Sending request to:', options);

const req = http.request(options, (res) => {
  console.log('Response status:', res.statusCode);
  console.log('Response headers:', res.headers);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:', body);
    try {
      const parsed = JSON.parse(body);
      console.log('Parsed response:', parsed);
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
