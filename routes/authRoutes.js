const express = require("express");

const {
  signup,
  login,
  googleLogin,
  refreshToken,
  logout,
  getMe,
  changePassword
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

module.exports = router;