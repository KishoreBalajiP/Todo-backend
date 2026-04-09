const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

// detect production environment
const isProd = process.env.NODE_ENV === "production";

// shared cookie config
const cookieOptions = {
  httpOnly: true,
  secure: isProd, // true on Vercel
  sameSite: isProd ? "none" : "lax", // required for cross-domain cookies
};

// Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// generate tokens
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

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // set cookies correctly for HTTPS production
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

    // verify token from frontend
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

    // check if user exists
    let user = await User.findOne({ email });

    // create account automatically if not exists
    if (!user) {
      user = await User.create({
        email,
        name,
        avatar: picture,
        provider: "google",
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

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


// REFRESH TOKEN
exports.refreshToken = (req, res) => {

  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({
      message: "No refresh token"
    });
  }

  jwt.verify(
    token,
    process.env.REFRESH_SECRET,
    (err, user) => {

      if (err) {
        return res.status(403).json({
          message: "Invalid refresh token"
        });
      }

      const newAccessToken =
        generateAccessToken(user.id);

      res.cookie(
        "accessToken",
        newAccessToken,
        cookieOptions
      );

      res.json({
        message: "Token refreshed"
      });
    }
  );
};


// LOGOUT
exports.logout = (req, res) => {

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  res.json({
    message: "Logged out"
  });
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

    if (oldPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    await user.save();

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