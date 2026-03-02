const { execSync } = require('child_process');

try {
  console.log('Running database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('Database migrations completed successfully!');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}
