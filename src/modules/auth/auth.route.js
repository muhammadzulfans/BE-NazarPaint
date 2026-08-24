const { Router } = require("express");
const {
  register,
  login,
  forgotPassword,
  verifyOTP,
  resetPassword,
  changePassword,
} = require("./auth.controller");
const { authenticate } = require("../../middleware/auth.middleware");

const router = Router();

router.post("/register", register);
router.post("/login", login);

// ─── BARU: Forgot Password Flow (Public) ────────────────────────────────────
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

// ─── BARU: Change Password (Harus Login) ────────────────────────────────────
router.post("/change-password", authenticate, changePassword);

module.exports = router;