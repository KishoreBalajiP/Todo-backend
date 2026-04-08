const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

    if (exists)
      return res.status(400).json({
        message: "User already exists"
      });

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

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRE }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRE }
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });

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


// REFRESH TOKEN
exports.refreshToken = (req, res) => {

  const token = req.cookies.refreshToken;

  if (!token)
    return res.status(401).json({
      message: "No refresh token"
    });

  jwt.verify(
    token,
    process.env.REFRESH_SECRET,
    (err, user) => {

      if (err)
        return res.status(403).json({
          message: "Invalid refresh token"
        });

      const newAccessToken =
        generateAccessToken(user.id);

      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false
      });

      res.json({
        message: "Token refreshed"
      });
    }
  );
};


// LOGOUT
exports.logout = (req, res) => {

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

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