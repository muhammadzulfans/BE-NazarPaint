const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Pastikan folder uploads/avatars ada
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // JWT payload pakai userId bukan id
    const userId = req.user?.userId || req.user?.id || 'user';
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `avatar-${userId}-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb({ statusCode: 400, message: 'Format file tidak didukung. Gunakan JPG, PNG, atau WEBP' }, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // max 2MB
  }
});

module.exports = upload;