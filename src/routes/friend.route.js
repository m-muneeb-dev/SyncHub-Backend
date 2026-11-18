const express = require('express')
const { sendFriendRequest, getFriendRequest, getSentFriendRequests, acceptFriendRequest, rejectFriendRequest, getFriends, cancelFriendRequest, deleteFriend } = require('../controllers/friend.controller')
const verifyToken = require('../middlewares/auth.middleware')

const router = express.Router();

router.post("/request", verifyToken, sendFriendRequest);
router.get("/received", verifyToken, getFriendRequest);
router.get("/sent", verifyToken, getSentFriendRequests);
router.patch("/:requestId/accept", verifyToken, acceptFriendRequest);
router.patch("/:requestId/reject", verifyToken, rejectFriendRequest);
router.get("/", verifyToken, getFriends);
router.delete("/requests/:requestId", verifyToken, cancelFriendRequest);
router.delete("/:friendId", verifyToken, deleteFriend);
module.exports = router;
