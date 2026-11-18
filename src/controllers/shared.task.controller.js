const mongoose = require("mongoose");
const SharedTask = require("../models/shared.task.model");
const Task = require("../models/task.model");
const User = require("../models/user.model");
const FriendRequest = require("../models/friend.request.model");

// Helper for authentication check
const isAuthenticated = (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({
            success: false,
            message: "Not authenticated. Please sign in."
        });
    }
    return null;
};

// Share Task (Supports single task_id or multiple task_ids)
const shareTask = async (req, res, next) => {
    try {
        const authError = isAuthenticated(req, res);
        if (authError) return authError;

        const { task_id, task_ids, collaborator, status = "pending" } = req.body;

        // Support both single task_id and multiple task_ids array
        const rawTaskIds = Array.isArray(task_ids)
            ? task_ids
            : (task_id ? [task_id] : []);

        if (rawTaskIds.length === 0 || !collaborator) {
            return res.status(400).json({
                success: false,
                message: "At least one Task ID and a collaborator ID are required."
            });
        }

        if (!mongoose.Types.ObjectId.isValid(collaborator)) {
            return res.status(400).json({
                success: false,
                message: "Invalid collaborator ID."
            });
        }

        const invalidTaskId = rawTaskIds.find((id) => !mongoose.Types.ObjectId.isValid(id));
        if (invalidTaskId) {
            return res.status(400).json({
                success: false,
                message: `Invalid task ID: ${invalidTaskId}`
            });
        }

        if (collaborator === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot share a task with yourself."
            });
        }

        const allowedStatuses = ["pending", "in-progress", "completed"];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid status: pending, in-progress, or completed."
            });
        }

        // Parallel database queries for collaborator and friendship
        const [collaboratorUser, isFriend] = await Promise.all([
            User.findById(collaborator),
            FriendRequest.findOne({
                status: "accepted",
                $or: [
                    { requester: req.user._id, recipient: collaborator },
                    { requester: collaborator, recipient: req.user._id }
                ]
            })
        ]);

        if (!collaboratorUser) {
            return res.status(404).json({
                success: false,
                message: "Collaborator not found."
            });
        }

        if (!isFriend) {
            return res.status(403).json({
                success: false,
                message: "You can only share tasks with your friends."
            });
        }

        // Find all tasks owned by req.user._id matching the requested IDs
        const ownedTasks = await Task.find({
            _id: { $in: rawTaskIds },
            owner_id: req.user._id
        });

        if (ownedTasks.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found or you are not authorized to share it."
            });
        }

        const ownedTaskIds = ownedTasks.map((t) => t._id.toString());

        // Check which tasks are already shared with this collaborator
        const existingShared = await SharedTask.find({
            task_id: { $in: ownedTaskIds },
            collaborator
        });

        const alreadySharedSet = new Set(existingShared.map((st) => st.task_id.toString()));
        const tasksToShare = ownedTaskIds.filter((id) => !alreadySharedSet.has(id));

        if (tasksToShare.length === 0) {
            return res.status(409).json({
                success: false,
                message: rawTaskIds.length === 1
                    ? "This task has already been shared with this friend."
                    : "All selected tasks have already been shared with this friend."
            });
        }

        // Bulk insert the shared tasks
        const docsToCreate = tasksToShare.map((tId) => ({
            task_id: tId,
            collaborator,
            shared_by: req.user._id,
            status
        }));

        const createdSharedTasks = await SharedTask.insertMany(docsToCreate);

        const populatedSharedTasks = await SharedTask.find({
            _id: { $in: createdSharedTasks.map((doc) => doc._id) }
        })
            .populate("task_id")
            .populate("collaborator", "name email")
            .populate("shared_by", "name email");

        // Backward compatibility for single task request (if task_id was passed and not task_ids array)
        if (rawTaskIds.length === 1 && !Array.isArray(task_ids)) {
            return res.status(201).json({
                success: true,
                message: "Task shared successfully.",
                data: populatedSharedTasks[0]
            });
        }

        return res.status(201).json({
            success: true,
            message: `${populatedSharedTasks.length} task(s) shared successfully.${
                alreadySharedSet.size > 0 ? ` (${alreadySharedSet.size} were already shared)` : ""
            }`,
            count: populatedSharedTasks.length,
            data: populatedSharedTasks,
            alreadySharedCount: alreadySharedSet.size
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "This task has already been shared with this friend."
            });
        }
        next(error);
    }
};

// Get Shared Tasks
const getSharedTasks = async (req, res, next) => {
    try {
        const authError = isAuthenticated(req, res);
        if (authError) return authError;

        let filter = { collaborator: req.user._id };

        if (req.query.type === "sent") {
            filter = { shared_by: req.user._id };
        } else if (req.query.type === "all") {
            filter = {
                $or: [
                    { collaborator: req.user._id },
                    { shared_by: req.user._id }
                ]
            };
        }

        const sharedTasks = await SharedTask.find(filter)
            .populate("task_id")
            .populate("collaborator", "name email")
            .populate("shared_by", "name email")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: sharedTasks.length,
            data: sharedTasks
        });

    } catch (error) {
        next(error);
    }
};

// Update Shared Task Status
const updateSharedTaskStatus = async (req, res, next) => {
    try {
        const authError = isAuthenticated(req, res);
        if (authError) return authError;

        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid shared task ID."
            });
        }

        const allowedStatuses = ["pending", "in-progress", "completed"];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid status: pending, in-progress, or completed."
            });
        }

        const sharedTask = await SharedTask.findOneAndUpdate(
            {
                _id: id,
                $or: [
                    { collaborator: req.user._id },
                    { shared_by: req.user._id }
                ]
            },
            { $set: { status } },
            { new: true, runValidators: true }
        )
            .populate("task_id")
            .populate("collaborator", "name email")
            .populate("shared_by", "name email");

        if (!sharedTask) {
            return res.status(404).json({
                success: false,
                message: "Shared task not found or you are not authorized."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Shared task status updated successfully.",
            data: sharedTask
        });

    } catch (error) {
        next(error);
    }
};

// Remove Shared Task
const removeSharedTask = async (req, res, next) => {
    try {
        const authError = isAuthenticated(req, res);
        if (authError) return authError;

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid shared task ID."
            });
        }

        const sharedTask = await SharedTask.findOneAndDelete({
            _id: id,
            shared_by: req.user._id
        });

        if (!sharedTask) {
            return res.status(404).json({
                success: false,
                message: "Shared task not found or you are not authorized to remove it."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Shared task removed successfully."
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    shareTask,
    getSharedTasks,
    updateSharedTaskStatus,
    removeSharedTask
};