const express = require('express')
const { createTask, getTask, updatetask, getOneTask, deleteTask } = require('../controllers/task.controller')
const verifyToken = require('../middlewares/auth.middleware')

const router = express.Router()
router.post('/create', verifyToken, createTask)
router.get("/", verifyToken, getTask);
router.patch("/:id", verifyToken, updatetask);
router.get("/:id", verifyToken, getOneTask);
router.delete("/:id", verifyToken, deleteTask);

module.exports = router;
