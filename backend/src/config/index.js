require('dotenv').config();

const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.PHONE_NUMBER_ID,
    verifyToken: process.env.VERIFY_TOKEN || 'your_verify_token',
    graphApiVersion: 'v21.0'
  },
  
  facebook: {
    accessToken: process.env.FB_ACCESS_TOKEN,
    pageId: process.env.FB_PAGE_ID,
    appId: process.env.FB_APP_ID,
    appSecret: process.env.FB_APP_SECRET
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4.1'
  },
  
  storage: {
    type: process.env.STORAGE_TYPE || 'json',
    mongodb: {
      uri: process.env.MONGODB_URI
    },
    sql: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  }
};

module.exports = config;
