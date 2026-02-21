const Task = require("../models/Task");

exports.getTasks = async (req, res) => {
  try {
    const { recurring } = req.query;

    let filter = { user: req.user };

    // recurring filter
    if (recurring && recurring !== "all") {
      filter.recurring = recurring;
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    console.error("GET TASK ERROR:", err.message);
    res.status(500).json({ message: "Server error while fetching tasks" });
  }
};

exports.createTask = async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      user: req.user,
    });

    res.status(201).json(task);
  } catch (err) {
    console.error("CREATE TASK ERROR:", err.message);
    res.status(500).json({ message: "Server error while creating task" });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { completed } = req.body;

    // get existing task first
    const existingTask = await Task.findById(req.params.id);

    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // 🔥 WHEN TASK IS COMPLETED
    if (completed === true) {

      // 🧨 CASE 1 — NON RECURRING → DELETE
      if (!existingTask.recurring || existingTask.recurring === "none") {
        await Task.findByIdAndDelete(existingTask._id);
        return res.json({ message: "Task completed and removed" });
      }

      // 🔁 CASE 2 — RECURRING → CREATE NEXT INSTANCE
      let nextDate = new Date(existingTask.dueDate || new Date());

      if (existingTask.recurring === "daily") {
        nextDate.setDate(nextDate.getDate() + 1);
      }

      if (existingTask.recurring === "weekly") {
        nextDate.setDate(nextDate.getDate() + 7);
      }

      if (existingTask.recurring === "monthly") {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      // delete today's completed task
      await Task.findByIdAndDelete(existingTask._id);

      // create next occurrence
      const newTask = await Task.create({
        title: existingTask.title,
        description: existingTask.description,
        dueDate: nextDate,
        recurring: existingTask.recurring,
        completed: false,
        user: existingTask.user,
      });

      return res.json(newTask);
    }

    // NORMAL UPDATE (original behavior preserved)
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);

  } catch (err) {
    console.error("UPDATE TASK ERROR:", err.message);
    res.status(500).json({ message: "Server error while updating task" });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const deleted = await Task.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error("DELETE TASK ERROR:", err.message);
    res.status(500).json({ message: "Server error while deleting task" });
  }
};