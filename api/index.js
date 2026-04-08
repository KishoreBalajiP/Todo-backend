const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

const connectDB = require("../config/db");

dotenv.config();

connectDB();

const app = express();


// DYNAMIC CORS CONFIG
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173"
];

app.use(cors({
  origin: function (origin, callback) {

    // allow server-to-server, Postman, curl etc
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS not allowed"));
  },

  credentials: true
}));


app.use(express.json());

app.use(cookieParser());


// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Server running successfully");
});


// ROUTES
app.use("/api/auth",
  require("../routes/authRoutes"));

app.use("/api/tasks",
  require("../routes/taskRoutes"));


module.exports = app; 