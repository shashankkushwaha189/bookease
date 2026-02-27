import { logger } from '../src/index';

console.log('--- Testing Logger Redaction ---');

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

console.log('--- Redaction Test Complete ---');
