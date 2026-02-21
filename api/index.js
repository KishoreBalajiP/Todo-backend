const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("../config/db");

dotenv.config();
connectDB();

const app = express();

// Allow everything (*)
app.use(cors({
  origin: "*",
  methods: "*",
  allowedHeaders: "*"
}));

app.use(express.json());

// test route 
app.get("/", (req, res) => {
  res.send("Server running successfully");
});

app.use("/api/auth", require("../routes/authRoutes"));
app.use("/api/tasks", require("../routes/taskRoutes"));

module.exports = app;