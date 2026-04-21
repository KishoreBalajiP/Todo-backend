const jwt = require("jsonwebtoken");
const { redisClient } = require("../config/redis");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {

    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({
        message: "No token"
      });
    }

    const isBlacklisted = await redisClient.get(
      `blacklist:${token}`
    );

    if (isBlacklisted) {
      return res.status(401).json({
        message: "Token expired"
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userExists = await User.findById(decoded.id);

    if (!userExists) {
      return res.status(401).json({
        message: "User no longer exists"
      });
    }

    req.user = decoded.id;

    next();

  } catch (error) {

    return res.status(401).json({
      message: "Invalid token"
    });

  }
};