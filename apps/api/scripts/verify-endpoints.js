const http = require('http');

const check = (path) => {
    return new Promise((resolve) => {
        http.get(`http://localhost:3000${path}`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`PATH: ${path}`);
                console.log(`STATUS: ${res.statusCode}`);
                console.log(`BODY: ${data}`);
                console.log(`CORRELATION-ID: ${res.headers['x-correlation-id']}`);
                console.log('---');
                resolve();
            });
        }).on('error', (err) => {
            console.log(`ERROR for ${path}: ${err.message}`);
            console.log('Is your server running? (npm run dev)');
            resolve();
        });
    });
};

async function run() {
    console.log('--- System Endpoint Verification ---');
    await check('/health');
    await check('/unknown');
}

run();
