const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const envSrc = path.join(root, '.env');
const envExample = path.join(root, '.env.example');

if (!fs.existsSync(envSrc)) {
  if (fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envSrc);
    console.log('Created .env from .env.example');
  } else {
    console.error('Missing .env.example');
    process.exit(1);
  }
}

// Prisma also reads .env next to the schema when run from workspace
const dbEnv = path.join(root, 'packages', 'database', '.env');
fs.copyFileSync(envSrc, dbEnv);
console.log('Synced .env → packages/database/.env');
console.log('');
console.log('Next steps:');
console.log('  1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/');
console.log('  2. npm run docker:infra');
console.log('  3. npm run db:migrate');
console.log('  4. npm run db:seed');
console.log('  5. npm run dev');
