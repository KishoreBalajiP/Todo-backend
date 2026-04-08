const express = require("express");

const {
  signup,
  login,
  refreshToken,
  logout,
  getMe
} = require("../controllers/authController");

const authMiddleware =
  require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.post("/refresh", refreshToken);

router.post("/logout", logout);

router.get("/me", authMiddleware, getMe);

module.exports = router;