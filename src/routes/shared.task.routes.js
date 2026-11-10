const express = require('express');
const router = express.Router();
const {
    shareTask,
    getSharedTasks,
    updateSharedTaskStatus,
    removeSharedTask
} = require('../controllers/shared.task.controller');

// Agar aapke paas auth middleware hai toh usko yahan import karke use kar sakte hain
// const { protect } = require('../middlewares/auth.middleware');

router.route('/')
    .get(getSharedTasks)       // .get(protect, getSharedTasks)
    .post(shareTask);          // .post(protect, shareTask)

router.route('/:id')
    .put(updateSharedTaskStatus)     // .put(protect, updateSharedTaskStatus)
    .delete(removeSharedTask);       // .delete(protect, removeSharedTask)

module.exports = router;