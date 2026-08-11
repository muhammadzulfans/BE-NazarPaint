const { verifyToken } = require('../utils/jwt.util');

// Cek apakah user sudah login
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Tidak terautentikasi. Harap login terlebih dahulu'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(err.statusCode || 401).json({
      success: false,
      message: err.message || 'Token tidak valid'
    });
  }
};

// Cek role: authorize('OWNER') atau authorize('OWNER', 'KARYAWAN')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Akses ditolak. Hanya ${roles.join(' atau ')} yang dapat mengakses ini` 
      });
    }

    next();
  };
};

// Cek akses cabang — karyawan hanya bisa akses storeId-nya sendiri
// Owner bisa akses semua
const authorizeStore = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
  }

  // Owner bebas akses semua cabang
  if (req.user.role === 'OWNER') return next();

  // Karyawan: storeId dari token harus cocok dengan storeId di params/query/body
  const requestedStoreId =
    req.params.storeId ||
    req.query.storeId ||
    req.body.storeId;

  if (!requestedStoreId) {
    return res.status(400).json({ success: false, message: 'storeId wajib disertakan' });
  }

  if (req.user.storeId !== requestedStoreId) {
    return res.status(403).json({ 
      success: false, 
      message: 'Akses ditolak. Anda tidak memiliki akses ke cabang ini' 
    });
  }

  next();
};

module.exports = { authenticate, authorize, authorizeStore };