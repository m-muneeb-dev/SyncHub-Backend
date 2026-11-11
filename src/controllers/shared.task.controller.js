
const mongoose = require("mongoose");
const SharedTask = require("../models/shared.task.model");
const Task = require("../models/task.model");
const User = require("../models/user.model");
const FriendRequest = require("../models/friend.request.model");

// Share Task
const shareTask = async (req, res, next) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated. Please sign in."
            });
        }

        const { task_id, collaborator, status } = req.body;

        if (!task_id || !collaborator) {
            return res.status(400).json({
                success: false,
                message: "Task ID and collaborator ID are required."
            });
        }

        if (!mongoose.Types.ObjectId.isValid(task_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid task ID."
            });
        }

        if (!mongoose.Types.ObjectId.isValid(collaborator)) {
            return res.status(400).json({
                success: false,
                message: "Invalid collaborator ID."
            });
        }

        // Check task ownership
        const task = await Task.findOne({
            _id: task_id,
            owner_id: req.user._id
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found or you are not authorized to share it."
            });
        }

        // Find collaborator
        const collaboratorUser = await User.findById(collaborator);

        if (!collaboratorUser) {
            return res.status(404).json({
                success: false,
                message: "Collaborator not found."
            });
        }

        // Prevent sharing with yourself
        if (collaboratorUser._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot share a task with yourself."
            });
        }

        // Check accepted friendship
        const isFriend = await FriendRequest.findOne({
            status: "accepted",
            $or: [
                {
                    requester: req.user._id,
                    recipient: collaboratorUser._id
                },
                {
                    requester: collaboratorUser._id,
                    recipient: req.user._id
                }
            ]
        });

        if (!isFriend) {
            return res.status(403).json({
                success: false,
                message: "You can only share tasks with your friends."
            });
        }

        // Check existing shared task
        const existingShared = await SharedTask.findOne({
            task_id,
            collaborator: collaboratorUser._id
        });

        if (existingShared) {
            return res.status(409).json({
                success: false,
                message: "This task has already been shared with this friend."
            });
        }

        // Validate status
        const allowedStatuses = [
            "pending",
            "in-progress",
            "completed"
        ];

        const initialStatus = status || "pending";

        if (!allowedStatuses.includes(initialStatus)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid status: pending, in-progress, or completed."
            });
        }

        // Create shared task
        const sharedTask = await SharedTask.create({
            task_id,
            collaborator: collaboratorUser._id,
            shared_by: req.user._id,
            status: initialStatus
        });

        await sharedTask.populate([
            { path: "task_id" },
            { path: "collaborator", select: "name email" },
            { path: "shared_by", select: "name email" }
        ]);

        return res.status(201).json({
            success: true,
            message: "Task shared successfully.",
            data: sharedTask
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
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated. Please sign in."
            });
        }

        let filter = {
            collaborator: req.user._id
        };

        if (req.query.type === "sent") {
            filter = {
                shared_by: req.user._id
            };
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
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated. Please sign in."
            });
        }

        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid shared task ID."
            });
        }

        const allowedStatuses = [
            "pending",
            "in-progress",
            "completed"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid status: pending, in-progress, or completed."
            });
        }

        // Collaborator or original sharer can update status
        const sharedTask = await SharedTask.findOneAndUpdate(
            {
                _id: id,
                $or: [
                    { collaborator: req.user._id },
                    { shared_by: req.user._id }
                ]
            },
            {
                $set: {
                    status
                }
            },
            {
                new: true,
                runValidators: true
            }
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
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated. Please sign in."
            });
        }

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid shared task ID."
            });
        }

        const sharedTask = await SharedTask.findOneAndDelete({
            _id: id,
            $or: [
                { shared_by: req.user._id },
                { collaborator: req.user._id }
            ]
        });

        if (!sharedTask) {
            return res.status(404).json({
                success: false,
                message: "Shared task not found or you are not authorized."
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