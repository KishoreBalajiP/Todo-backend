const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

// NEW: Redis import
const { redisClient } = require("../config/redis");

// NEW: MFA imports
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

// detect production environment
const isProd = process.env.NODE_ENV === "production";

// shared cookie config
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// TOKEN GENERATORS
const generateAccessToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRE }
  );
};

const generateRefreshToken = (id) => {
  return jwt.sign(
    { id },
    process.env.REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRE }
  );
};


// SIGNUP
exports.signup = async (req, res) => {
  try {

    const { email, password } = req.body;

    const exists = await User.findOne({ email });

    if (exists) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      email,
      password: hashed
    });

    res.status(201).json({
      message: "Signup successful"
    });

  } catch (err) {

    console.error("Signup error:", err.message);

    res.status(500).json({
      message: "Signup failed"
    });
  }
};


// LOGIN
exports.login = async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password required",
      });
    }

    const user = await User.findOne({ email });

    if (!user || !user.password) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const match = await bcrypt.compare(
      password,
      user.password
    );

    if (!match) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // MFA CHECK
    if (user.mfaEnabled) {
      return res.json({
        mfaRequired: true,
        userId: user._id
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await redisClient.set(
      `refresh:${user._id}`,
      refreshToken,
      { EX: 7 * 24 * 60 * 60 }
    );

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.json({
      message: "Login successful",
    });

  } catch (err) {

    console.error("LOGIN ERROR:", err);

    res.status(500).json({
      message: "Server error during login",
    });
  }
};


// GOOGLE LOGIN
exports.googleLogin = async (req, res) => {
  try {

    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Missing Google credential",
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const { email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({
        message: "Google authentication failed",
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name,
        avatar: picture,
        provider: "google",
      });
    }

    // MFA CHECK
    if (user.mfaEnabled) {
      return res.json({
        mfaRequired: true,
        userId: user._id
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await redisClient.set(
      `refresh:${user._id}`,
      refreshToken,
      { EX: 7 * 24 * 60 * 60 }
    );

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.json({
      message: "Google login successful",
    });

  } catch (err) {

    console.error("GOOGLE LOGIN ERROR:", err);

    res.status(401).json({
      message: "Google authentication failed",
    });
  }
};


// GENERATE MFA QR
exports.generateMfaSecret = async (req, res) => {
  try {

    const user = await User.findById(req.user);

    const secret = speakeasy.generateSecret({
      length: 20,
      name: `SecureApp (${user.email})`,
    });

    user.mfaSecret = secret.base32;
    await user.save();

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      qrCode,
      message: "Scan QR with Google Authenticator"
    });

  } catch (err) {

    console.error("MFA SECRET ERROR:", err);

    res.status(500).json({
      message: "Failed to generate MFA secret"
    });

  }
};


// VERIFY MFA SETUP
exports.verifyMfaSetup = async (req, res) => {

  try {

    const { token } = req.body;

    const user = await User.findById(req.user);

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({
        message: "Invalid verification code"
      });
    }

    user.mfaEnabled = true;
    await user.save();

    res.json({
      message: "MFA enabled successfully"
    });

  } catch (err) {

    console.error("MFA VERIFY ERROR:", err);

    res.status(500).json({
      message: "Verification failed"
    });

  }
};


// VERIFY MFA LOGIN
exports.verifyMfaLogin = async (req, res) => {

  try {

    const { userId, token } = req.body;

    const user = await User.findById(userId);

    if (!user || !user.mfaEnabled) {
      return res.status(400).json({
        message: "MFA not enabled"
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({
        message: "Invalid MFA code"
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await redisClient.set(
      `refresh:${user._id}`,
      refreshToken,
      { EX: 7 * 24 * 60 * 60 }
    );

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.json({
      message: "Login successful"
    });

  } catch (err) {

    console.error("MFA LOGIN ERROR:", err);

    res.status(500).json({
      message: "MFA verification failed"
    });

  }
};


// REFRESH TOKEN
exports.refreshToken = async (req, res) => {

  try {

    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({
        message: "No refresh token"
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.REFRESH_SECRET
    );

    const storedToken = await redisClient.get(
      `refresh:${decoded.id}`
    );

    if (!storedToken || storedToken !== token) {
      return res.status(403).json({
        message: "Invalid refresh token"
      });
    }

    const newAccessToken =
      generateAccessToken(decoded.id);

    res.cookie(
      "accessToken",
      newAccessToken,
      cookieOptions
    );

    res.json({
      message: "Token refreshed"
    });

  } catch {

    res.status(403).json({
      message: "Invalid refresh token"
    });

  }
};


// LOGOUT
exports.logout = async (req, res) => {

  try {

    const accessToken = req.cookies.accessToken;

    if (accessToken) {
      await redisClient.set(
        `blacklist:${accessToken}`,
        "true",
        { EX: 60 * 60 }
      );
    }

    if (req.user) {
      await redisClient.del(
        `refresh:${req.user}`
      );
    }

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    res.json({
      message: "Logged out"
    });

  } catch (err) {

    console.error("Logout error:", err);

    res.status(500).json({
      message: "Logout failed"
    });

  }
};


// GET CURRENT USER
exports.getMe = async (req, res) => {

  try {

    const user = await User
      .findById(req.user)
      .select("-password");

    res.json(user);

  } catch {

    res.status(500).json({
      message: "Server error"
    });
  }
};


// CHANGE PASSWORD
exports.changePassword = async (req, res) => {

  try {

    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Email, old password and new password required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(
      oldPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Old password incorrect",
      });
    }

    const hashed = await bcrypt.hash(
      newPassword,
      10
    );

    user.password = hashed;

    await user.save();

    await redisClient.del(
      `refresh:${user._id}`
    );

    res.json({
      message: "Password updated successfully",
    });

  } catch (err) {

    console.error("CHANGE PASSWORD ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
};