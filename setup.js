#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚗 Car Garage Portal Setup');
console.log('========================\n');

// Check if Node.js is installed
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Node.js version: ${nodeVersion}`);
} catch (error) {
  console.error('❌ Node.js is not installed. Please install Node.js v16 or higher.');
  process.exit(1);
}

// Check if PostgreSQL is available
try {
  execSync('psql --version', { encoding: 'utf8' });
  console.log('✅ PostgreSQL is available');
} catch (error) {
  console.warn('⚠️  PostgreSQL not found. Please ensure PostgreSQL is installed and accessible.');
}

console.log('\n📦 Installing dependencies...');

try {
  // Install root dependencies
  console.log('Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Install backend dependencies
  console.log('Installing backend dependencies...');
  execSync('cd backend && npm install', { stdio: 'inherit' });

  // Install frontend dependencies
  console.log('Installing frontend dependencies...');
  execSync('cd frontend && npm install', { stdio: 'inherit' });

  console.log('✅ All dependencies installed successfully!');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

console.log('\n🔧 Setting up environment files...');

// Create backend .env file if it doesn't exist
const backendEnvPath = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(backendEnvPath)) {
  const envExamplePath = path.join(__dirname, 'backend', 'env.example');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, backendEnvPath);
    console.log('✅ Created backend/.env file');
    console.log('⚠️  Please update backend/.env with your database credentials');
  }
}

// Create frontend .env file if it doesn't exist
const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
if (!fs.existsSync(frontendEnvPath)) {
  const frontendEnvContent = `REACT_APP_API_URL=http://localhost:5000/api
`;
  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log('✅ Created frontend/.env file');
}

console.log('\n📋 Next Steps:');
console.log('==============');
console.log('1. Set up PostgreSQL database:');
console.log('   CREATE DATABASE car_garage_db;');
console.log('');
console.log('2. Update backend/.env with your database credentials:');
console.log('   DATABASE_URL="postgresql://username:password@localhost:5432/car_garage_db"');
console.log('   JWT_SECRET="your-super-secret-jwt-key-here"');
console.log('');
console.log('3. Run database migrations:');
console.log('   cd backend && npm run db:generate && npm run db:migrate');
console.log('');
console.log('4. Start the application:');
console.log('   npm run dev');
console.log('');
console.log('5. Access the application:');
console.log('   Frontend: http://localhost:3000');
console.log('   Backend API: http://localhost:5000');
console.log('');
console.log('🎉 Setup complete! Happy coding!');
