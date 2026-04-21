const express = require("express");

const {
  signup,
  login,
  googleLogin,
  refreshToken,
  logout,
  getMe,
  changePassword,

  // NEW MFA controllers
  generateMfaSecret,
  verifyMfaSetup,
  verifyMfaLogin

} = require("../controllers/authController");

const authMiddleware =
  require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.post("/google", googleLogin);

router.post("/refresh", refreshToken);

router.post("/logout", logout);

router.get("/me", authMiddleware, getMe);

// router.put("/change-password", authMiddleware, changePassword);
router.put("/change-password", changePassword);


// MFA ROUTES

// Step 1: Generate QR
router.post(
  "/mfa/setup",
  authMiddleware,
  generateMfaSecret
);

// Step 2: Verify QR code entry
router.post(
  "/mfa/verify-setup",
  authMiddleware,
  verifyMfaSetup
);

// Step 3: Verify MFA during login
router.post(
  "/mfa/login",
  verifyMfaLogin
);

module.exports = router;