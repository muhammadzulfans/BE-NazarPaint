const authService = require("./auth.service");

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, message: "Registrasi berhasil", data: result });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json({ success: true, message: "Login berhasil", data: result });
  } catch (err) {
    next(err);
  }
};

// ─── BARU ───────────────────────────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body);
    res.status(200).json({ success: true, message: result.message, data: result });
  } catch (err) {
    next(err);
  }
};

const verifyOTP = async (req, res, next) => {
  try {
    const result = await authService.verifyOTP(req.body);
    res.status(200).json({ success: true, message: result.message, data: result });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body);
    res.status(200).json({ success: true, message: result.message, data: result });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const result = await authService.changePassword({
      userId: req.user.userId, // dari auth middleware
      oldPassword: req.body.oldPassword,
      newPassword: req.body.newPassword,
    });
    res.status(200).json({ success: true, message: result.message, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  verifyOTP,
  resetPassword,
  changePassword,
};