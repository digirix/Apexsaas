// Quick server startup script to bypass connection issues
const { spawn } = require('child_process');

console.log('Starting server with optimized settings...');

const server = spawn('tsx', ['server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
});

server.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Keep the script running
process.on('SIGINT', () => {
  console.log('Stopping server...');
  server.kill('SIGINT');
  process.exit(0);
});