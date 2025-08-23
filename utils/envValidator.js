const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET'
];

const optionalEnvVars = [
  'OPENROUTER_API_KEY',
  'DEEPSEEK_API_KEY',
  'PORT',
  'NODE_ENV'
];

function validateEnvironment() {
  const missing = [];
  const warnings = [];

  // Check required environment variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long for security');
  }

  // Check for default/weak values
  if (process.env.JWT_SECRET === 'your-secret-key') {
    missing.push('JWT_SECRET (using default insecure value)');
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Please copy .env.example to .env and configure the values');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
  }

  // Set defaults for optional variables
  process.env.PORT = process.env.PORT || '3000';
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '12';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

  console.log('✅ Environment validation passed');
}

module.exports = { validateEnvironment };
