require('dotenv').config();

const app = require('../src/app');

// Cleanup saat serverless function selesai
process.on('SIGTERM', async () => {
    const prisma = require('../src/lib/prisma');
    await prisma.$disconnect();
});

module.exports = app;