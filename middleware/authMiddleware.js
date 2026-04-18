const jwt = require("jsonwebtoken");

// import Redis client
const { redisClient } = require("../config/redis");

module.exports = async (req, res, next) => {

  try {

    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({
        message: "No token"
      });
    }

    // check if token is blacklisted in Redis
    const isBlacklisted = await redisClient.get(
      `blacklist:${token}`
    );

    if (isBlacklisted) {
      return res.status(401).json({
        message: "Token expired"
      });
    }

    // verify token normally
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded.id;

    next();

  } catch (error) {

    return res.status(401).json({
      message: "Invalid token"
    });

  }
};