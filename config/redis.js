const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    rejectUnauthorized: false
  }
});

redisClient.on("error", (err) =>
  console.error("Redis Error:", err)
);

const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log("Redis Connected");
  } catch (err) {
    console.error("Redis connection failed:", err);
    process.exit(1);
  }
};

module.exports = {
  redisClient,
  connectRedis
};