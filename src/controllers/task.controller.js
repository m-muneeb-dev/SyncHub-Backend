const Task = require('../models/task.model');
const { asyncHandler } = require("../middlewares/error.middleware");

// 1. Create task
const createTask = asyncHandler(async (req, res) => {
    const { title, description, priority, dueDate } = req.body;
    if (!title || !description || !priority || !dueDate) {
        return res.status(422).json({
            success: false,
            message: "Title, description, priority and due date are required"
        });
    }

    const task = await Task.create({
        owner_id: req.user._id,
        title,
        description,
        priority,
        dueDate
    });

    return res.status(201).json({
        success: true,
        message: "Task created successfully",
        task
    });
});

// 2. Get paginated tasks
const getTask = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
        Task.find({ owner_id: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Task.countDocuments({ owner_id: req.user._id })
    ]);

    return res.status(200).json({
        success: true,
        page,
        totalPages: Math.ceil(total / limit),
        totalTasks: total,
        count: tasks.length,
        tasks
    });
});

// 3. Get one task (Already implemented by you!)
const getOneTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userTask = await Task.findOne({ _id: id, owner_id: req.user._id }).lean();

    if (!userTask) {
        return res.status(404).json({ success: false, message: "Task not found" });
    }

    return res.status(200).json({ success: true, userTask });
});

// 4. Update task
const updatetask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, priority, dueDate } = req.body;

    const task = await Task.findOneAndUpdate(
        { _id: id, owner_id: req.user._id },
        {
            $set: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(priority !== undefined && { priority }),
                ...(dueDate !== undefined && { dueDate })
            }
        },
        { returnDocument: "after", runValidators: true }
    );

    if (!task) {
        return res.status(404).json({ success: false, message: "Task not found" });
    }

    return res.status(200).json({
        success: true,
        message: "Task updated successfully",
        task
    });
});

// 5. Delete task
const deleteTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const task = await Task.findOneAndDelete({ _id: id, owner_id: req.user._id });

    if (!task) {
        return res.status(404).json({ success: false, message: "Task not found" });
    }

    return res.status(200).json({
        success: true,
        message: "Task deleted successfully"
    });
});

module.exports = { createTask, getTask, updatetask, getOneTask, deleteTask };
