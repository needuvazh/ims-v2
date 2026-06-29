const { spawn } = require('child_process');

const migrate = spawn('npx', ['prisma', 'migrate', 'dev', '--name', 'iam_module_01_schema', '--create-only'], {
  env: { ...process.env, DATABASE_URL: 'postgresql://postgres:postgres@localhost:5435/ims_dev?schema=public' }
});

migrate.stdout.on('data', (data) => {
  process.stdout.write(data);
  if (data.toString().includes('We need to reset the PostgreSQL database') || 
      data.toString().includes('Are you sure you want to create this migration?') ||
      data.toString().includes('y/N')) {
    migrate.stdin.write('y\n');
  }
});

migrate.stderr.on('data', (data) => {
  process.stderr.write(data);
});

migrate.on('close', (code) => {
  process.exit(code);
});
