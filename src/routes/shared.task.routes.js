
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/auth.middleware");
const { shareTask, getSharedTasks, updateSharedTaskStatus, removeSharedTask } = require("../controllers/shared.task.controller");

router.use(verifyToken);

router.post("/", shareTask);
router.get("/", getSharedTasks);
router.patch("/:id/status", updateSharedTaskStatus);
router.delete("/:id", removeSharedTask);

module.exports = router;