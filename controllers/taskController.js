const Task = require("../models/Task");
const User = require("../models/User");

// NEW: Redis import
const { redisClient } = require("../config/redis");


exports.getTasks = async (req, res) => {
  try {

    const { recurring } = req.query;

    const cacheKey =
      recurring && recurring !== "all"
        ? `tasks:${req.user}:${recurring}`
        : `tasks:${req.user}:all`;

    // CHECK CACHE FIRST
    const cachedTasks = await redisClient.get(cacheKey);

    if (cachedTasks) {
      return res.json(JSON.parse(cachedTasks));
    }

    let filter = { user: req.user };

    if (recurring && recurring !== "all") {
      filter.recurring = recurring;
    }

    const tasks = await Task
      .find(filter)
      .sort({ createdAt: -1 });

    // STORE IN CACHE (60 seconds)
    await redisClient.set(
      cacheKey,
      JSON.stringify(tasks),
      { EX: 60 }
    );

    res.json(tasks);

  } catch (err) {

    console.error("GET TASK ERROR:", err.message);

    res.status(500).json({
      message: "Server error while fetching tasks",
    });

  }
};


exports.createTask = async (req, res) => {
  try {

    const user = await User.findById(req.user);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const taskCount = await Task.countDocuments({
      user: req.user,
    });

    if (!user.subscriptionActive && taskCount >= 5) {
      return res.status(403).json({
        message: "Free limit reached. Please upgrade to premium.",
      });
    }

    const task = await Task.create({
      ...req.body,
      user: req.user,
    });

    // CLEAR CACHE AFTER CREATE
    await redisClient.del(`tasks:${req.user}:all`);
    await redisClient.del(`tasks:${req.user}:daily`);
    await redisClient.del(`tasks:${req.user}:weekly`);
    await redisClient.del(`tasks:${req.user}:monthly`);

    res.status(201).json(task);

  } catch (err) {

    console.error("CREATE TASK ERROR:", err.message);

    res.status(500).json({
      message: "Server error while creating task",
    });

  }
};


exports.updateTask = async (req, res) => {
  try {

    const { completed } = req.body;

    const existingTask = await Task.findById(req.params.id);

    if (!existingTask) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    // WHEN TASK COMPLETED
    if (completed === true) {

      if (
        !existingTask.recurring ||
        existingTask.recurring === "none"
      ) {

        await Task.findByIdAndDelete(existingTask._id);

        // CLEAR CACHE
        await redisClient.del(`tasks:${req.user}:all`);

        return res.json({
          message: "Task completed and removed",
        });
      }

      let nextDate = new Date(
        existingTask.dueDate || new Date()
      );

      if (existingTask.recurring === "daily") {
        nextDate.setDate(nextDate.getDate() + 1);
      }

      if (existingTask.recurring === "weekly") {
        nextDate.setDate(nextDate.getDate() + 7);
      }

      if (existingTask.recurring === "monthly") {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      await Task.findByIdAndDelete(existingTask._id);

      const newTask = await Task.create({
        title: existingTask.title,
        description: existingTask.description,
        dueDate: nextDate,
        recurring: existingTask.recurring,
        completed: false,
        user: existingTask.user,
      });

      // CLEAR CACHE
      await redisClient.del(`tasks:${req.user}:all`);

      return res.json(newTask);
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        returnDocument: "after",
      }
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    // CLEAR CACHE
    await redisClient.del(`tasks:${req.user}:all`);

    res.json(task);

  } catch (err) {

    console.error("UPDATE TASK ERROR:", err.message);

    res.status(500).json({
      message: "Server error while updating task",
    });

  }
};


exports.deleteTask = async (req, res) => {
  try {

    const deleted = await Task.findByIdAndDelete(
      req.params.id
    );

    if (!deleted) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    // CLEAR CACHE
    await redisClient.del(`tasks:${req.user}:all`);

    res.json({
      message: "Task deleted",
    });

  } catch (err) {

    console.error("DELETE TASK ERROR:", err.message);

    res.status(500).json({
      message: "Server error while deleting task",
    });

  }
};