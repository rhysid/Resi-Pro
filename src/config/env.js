require('dotenv').config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  webBaseUrl: process.env.WEB_BASE_URL || 'http://localhost:3000',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
  sessionSecret: process.env.SESSION_SECRET || 'replace_this'
};
