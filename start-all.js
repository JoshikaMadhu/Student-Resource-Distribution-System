const { spawn } = require('child_process');
const path = require('path');

function run(command, args, cwd, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd, stdio: 'inherit', shell: true, ...options });
    proc.on('exit', (code) => {
      resolve(code);
    });
    proc.on('error', (err) => reject(err));
  });
}

(async () => {
  const root = path.resolve(__dirname);
  try {
    console.log('1) Running DB init (safe - errors will be ignored)');
    const initCode = await run('node', ['init-db-fixed.js'], path.join(root, 'backend'));
    if (initCode === 0) console.log('DB init completed');
    else console.log('DB init finished with code', initCode, '- continuing');
    
    console.log('\n2) Running schema updates');
    const updateCode = await run('node', ['update-schema.js'], path.join(root, 'backend'));
    if (updateCode === 0) console.log('Schema updates completed');
    else console.log('Schema updates finished with code', updateCode, '- continuing');
  } catch (err) {
    console.error('DB setup failed to start:', err);
  }

  console.log('\n2) Starting backend and frontend (logs will stream below)');

  // start backend
  const backend = spawn('npm', ['start'], { cwd: path.join(root, 'backend'), stdio: 'inherit', shell: true });
  // start frontend
  const frontend = spawn('npm', ['start'], { cwd: path.join(root, 'frontend'), stdio: 'inherit', shell: true });

  const cleanExit = (code) => {
    console.log('\nShutting down children...');
    if (!backend.killed) backend.kill('SIGTERM');
    if (!frontend.killed) frontend.kill('SIGTERM');
    process.exit(code);
  };

  process.on('SIGINT', () => cleanExit(0));
  process.on('SIGTERM', () => cleanExit(0));

  backend.on('exit', (code) => {
    console.log('Backend exited with', code);
    // If backend stops, optionally exit everything
    // cleanExit(code);
  });

  frontend.on('exit', (code) => {
    console.log('Frontend exited with', code);
    // cleanExit(code);
  });
})();
