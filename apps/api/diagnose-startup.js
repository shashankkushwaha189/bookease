const path = require('path');

console.log('Attempting to load app modules...');

try {
    // Try to load the main app
    console.log('Loading app.ts...');
    const appPath = path.join(__dirname, 'dist', 'app.js');
    
    console.log('App should be at:', appPath);
    console.log('Checking if dist exists...');
    
    const fs = require('fs');
    const distExists = fs.existsSync(path.join(__dirname, 'dist'));
    console.log('dist folder exists:', distExists);
    
    if (!distExists) {
        console.log('dist folder does not exist - need to compile TypeScript first');
        console.log('Running build...');
        
        const { execSync } = require('child_process');
        try {
            const buildOutput = execSync('npm run build 2>&1 | head -100', {
                cwd: __dirname,
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024
            });
            console.log('Build output:', buildOutput);
        } catch (e) {
            console.error('Build failed:', e.message);
            console.error('Build output:', e.stdout || e.stderr);
        }
    }
} catch (e) {
    console.error('Error:', e.message);
    console.error('Stack:', e.stack);
}
