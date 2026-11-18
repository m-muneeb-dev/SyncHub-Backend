const mongoose = require('mongoose');
const Task = require('../models/task.model');
const SharedTask = require('../models/shared.task.model');
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
        task: {
            ...task.toObject(),
            isOwner: true,
            isShared: false
        }
    });
});

// 2. Get paginated tasks (Returns user's own tasks + tasks shared with user)
const getTask = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const type = req.query.type || 'all'; // 'all' | 'personal' | 'shared'

    let sharedTaskMap = new Map();
    let sharedTaskIds = [];

    // Fetch shared tasks where logged-in user is collaborator
    if (type !== 'personal') {
        const sharedTasks = await SharedTask.find({ collaborator: req.user._id })
            .populate('shared_by', 'name email')
            .lean();

        sharedTasks.forEach((st) => {
            if (st.task_id) {
                const idStr = st.task_id.toString();
                sharedTaskMap.set(idStr, st);
                sharedTaskIds.push(st.task_id);
            }
        });
    }

    // Build filter based on type
    let filter = {};
    if (type === 'personal') {
        filter = { owner_id: req.user._id };
    } else if (type === 'shared') {
        filter = { _id: { $in: sharedTaskIds } };
    } else {
        // 'all' -> owned tasks OR tasks shared with user
        if (sharedTaskIds.length > 0) {
            filter = {
                $or: [
                    { owner_id: req.user._id },
                    { _id: { $in: sharedTaskIds } }
                ]
            };
        } else {
            filter = { owner_id: req.user._id };
        }
    }

    const [tasks, total] = await Promise.all([
        Task.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('owner_id', 'name email')
            .lean(),
        Task.countDocuments(filter)
    ]);

    // Format tasks to include shared metadata
    const formattedTasks = tasks.map((task) => {
        const idStr = task._id.toString();
        const ownerIdStr = task.owner_id?._id
            ? task.owner_id._id.toString()
            : task.owner_id?.toString();

        const isOwner = ownerIdStr === req.user._id.toString();
        const sharedInfo = sharedTaskMap.get(idStr);

        if (!isOwner && sharedInfo) {
            return {
                ...task,
                isOwner: false,
                isShared: true,
                sharedStatus: sharedInfo.status,
                sharedBy: sharedInfo.shared_by,
                sharedTaskId: sharedInfo._id
            };
        }

        return {
            ...task,
            isOwner: true,
            isShared: false
        };
    });

    return res.status(200).json({
        success: true,
        page,
        totalPages: Math.ceil(total / limit),
        totalTasks: total,
        count: formattedTasks.length,
        tasks: formattedTasks
    });
});

// 3. Get one task (Supports owner and authorized collaborator)
const getOneTask = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid task ID" });
    }

    // First check if owner
    let userTask = await Task.findOne({ _id: id, owner_id: req.user._id })
        .populate('owner_id', 'name email')
        .lean();

    if (userTask) {
        return res.status(200).json({
            success: true,
            userTask: {
                ...userTask,
                isOwner: true,
                isShared: false
            }
        });
    }

    // Check if task is shared with the logged-in user
    const sharedRecord = await SharedTask.findOne({ task_id: id, collaborator: req.user._id })
        .populate('shared_by', 'name email')
        .lean();

    if (sharedRecord) {
        userTask = await Task.findById(id).populate('owner_id', 'name email').lean();
        if (userTask) {
            return res.status(200).json({
                success: true,
                userTask: {
                    ...userTask,
                    isOwner: false,
                    isShared: true,
                    sharedStatus: sharedRecord.status,
                    sharedBy: sharedRecord.shared_by,
                    sharedTaskId: sharedRecord._id
                }
            });
        }
    }

    return res.status(404).json({ success: false, message: "Task not found" });
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
        task: {
            ...task.toObject(),
            isOwner: true,
            isShared: false
        }
    });
});

// 5. Delete task
const deleteTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const task = await Task.findOneAndDelete({ _id: id, owner_id: req.user._id });

    if (!task) {
        return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Also clean up any shared task records associated with this task
    await SharedTask.deleteMany({ task_id: id });

    return res.status(200).json({
        success: true,
        message: "Task deleted successfully"
    });
});

module.exports = { createTask, getTask, updatetask, getOneTask, deleteTask };
