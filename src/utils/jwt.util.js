const jwt = require('jsonwebtoken');

const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw { statusCode: 401, message: 'Token sudah kadaluarsa' };
    }
    throw { statusCode: 401, message: 'Token tidak valid' };
  }
};

module.exports = { signToken, verifyToken };