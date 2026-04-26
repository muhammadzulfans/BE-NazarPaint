require('dotenv').config();
const app = require('./app');
const prisma = require('./lib/prisma');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

const start = async () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running  → http://localhost:${PORT}`);
    console.log(`📚 API Base        → http://localhost:${PORT}/api/v1`);
    console.log(`🌍 Environment     → ${process.env.NODE_ENV || 'development'}`);
  });
};

start();