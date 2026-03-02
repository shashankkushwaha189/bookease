const { execSync } = require('child_process');
try {
  const output = execSync('npx vitest run tests/audit_timeline.test.ts --threads=false --no-color', { encoding: 'utf8' });
  console.log('SUCCESS:', output);
} catch (error) {
  console.log('FAILURE STDOUT:', error.stdout);
  console.log('FAILURE STDERR:', error.stderr);
}
