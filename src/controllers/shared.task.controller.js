const SharedTask = require('../models/shared.task.model');

// @desc    Share a task with a collaborator
// @route   POST /api/shared-tasks
// @access  Private
const shareTask = async (req, res, next) => {
    try {
        const { task_id, collaborator, status } = req.body;

        const sharedTask = await SharedTask.create({
            task_id,
            collaborator,
            status
        });

        res.status(201).json({ success: true, data: sharedTask });
    } catch (error) {
        // Handle duplicate share error (due to unique index)
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: 'This task is already shared with this collaborator.' 
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all shared tasks for the user
// @route   GET /api/shared-tasks
// @access  Private
const getSharedTasks = async (req, res, next) => {
    try {
        const tasks = await SharedTask.find({ collaborator: req.user._id })
            .populate('task_id')
            .populate('collaborator', 'name email');

        res.status(200).json({ success: true, count: tasks.length, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update shared task status
// @route   PUT /api/shared-tasks/:id
// @access  Private
const updateSharedTaskStatus = async (req, res, next) => {
    try {
        const { status } = req.body;

        let sharedTask = await SharedTask.findById(req.params.id);

        if (!sharedTask) {
            return res.status(404).json({ success: false, message: 'Shared task not found' });
        }

        sharedTask = await SharedTask.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: sharedTask });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Remove shared task (Unshare)
// @route   DELETE /api/shared-tasks/:id
// @access  Private
const removeSharedTask = async (req, res, next) => {
    try {
        const sharedTask = await SharedTask.findById(req.params.id);

        if (!sharedTask) {
            return res.status(404).json({ success: false, message: 'Shared task not found' });
        }

        await sharedTask.deleteOne();

        res.status(200).json({ success: true, message: 'Task unshared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    shareTask,
    getSharedTasks,
    updateSharedTaskStatus,
    removeSharedTask
};