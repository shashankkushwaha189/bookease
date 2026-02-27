const pino = require('pino');

const logger = pino({
    level: 'info',
    redact: {
        paths: ['password', 'secret', 'token', 'jwt', 'apiKey', 'creditCard'],
        remove: true,
    },
});

console.log('--- REDACTION TEST START ---');
logger.info({ 
    user: 'test-user', 
    password: 'secret-password-123',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    msg: 'Attempting login' 
});

logger.warn({
    apiKey: 'sk_test_51Mz...',
    creditCard: '1234-5678-9012-3456',
    msg: 'Payment attempt'
});
console.log('--- REDACTION TEST END ---');
