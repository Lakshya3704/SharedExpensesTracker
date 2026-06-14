require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Fixed exchange rate: USD to INR
  // Using a configurable constant so balance calculations are deterministic
  // and can be explained during the live session
  exchangeRates: {
    USD_TO_INR: parseFloat(process.env.USD_TO_INR_RATE) || 83.0,
  },

  // Default currency when missing from CSV
  defaultCurrency: 'INR',

  // CORS origins
  corsOrigins: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : ['http://localhost:5173'],

  // Upload limits
  maxFileSize: 5 * 1024 * 1024, // 5MB
};
