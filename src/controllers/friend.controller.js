const friendRequest = require("../models/friend.request.model");
const User = require("../models/user.model");
const { asyncHandler } = require("../middlewares/error.middleware");

const sendFriendRequest = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
        return res.status(400).json({
            success: false,
            message: "Recipient email is required"
        });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const recipient = await User.findOne({
        email: normalizedEmail
    });
    if (!recipient) {
        return res.status(404).json({
            success: false,
            message: "User with this email does not exist"
        });
    }
    if (recipient._id.equals(req.user._id)) {
        return res.status(400).json({
            success: false,
            message: "You cannot send a friend request to yourself"
        });
    }
    const existingRequest = await friendRequest.findOne({
        $or: [
            {
                requester: req.user._id,
                recipient: recipient._id
            },
            {
                requester: recipient._id,
                recipient: req.user._id
            }
        ]
    });
    if (existingRequest) {
        if (existingRequest.status === "pending") {
            return res.status(409).json({
                success: false,
                message: "A pending friend request already exists"
            });
        }
        if (existingRequest.status === "accepted") {
            return res.status(409).json({
                success: false,
                message: "You are already friends"
            });
        }
        if (existingRequest.status === "rejected") {
            existingRequest.requester = req.user._id;
            existingRequest.recipient = recipient._id;
            existingRequest.status = "pending";
            await existingRequest.save();
            return res.status(200).json({
                success: true,
                message: "Friend request sent again",
                request: existingRequest
            });
        }
    }

    const friend_Request = await friendRequest.create({
        requester: req.user._id,
        recipient: recipient._id
    });

    return res.status(201).json({
        success: true,
        message: "Friend request sent successfully",
        friend_Request
    });
});

const getFriendRequest = asyncHandler(async (req, res) => {
    const requests = await friendRequest.find({
        recipient: req.user._id,
        status: "pending"
    })
    .populate("requester", "name email")
    .sort({ createdAt: -1 })
    .lean();

    return res.status(200).json({
        success: true,
        count: requests.length,
        requests
    });
});

const acceptFriendRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;

    const request = await friendRequest.findOne({
        _id: requestId,
        recipient: req.user._id,
        status: "pending"
    });

    if (!request) {
        return res.status(404).json({
            success: false,
            message: "Friend request not found"
        });
    }

    request.status = "accepted";
    await request.save();

    return res.status(200).json({
        success: true,
        message: "You accepted the request",
        request
    });
});

const rejectFriendRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;

    const request = await friendRequest.findOne({
        _id: requestId,
        recipient: req.user._id,
        status: "pending"
    });

    if (!request) {
        return res.status(404).json({
            success: false,
            message: "Friend request not found"
        });
    }

    request.status = "rejected";
    await request.save();

    return res.status(200).json({
        success: true,
        message: "Friend request rejected successfully",
        request
    });
});

const getFriends = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const friends = await friendRequest.aggregate([
        {
            $match: {
                status: "accepted",
                $or: [{ requester: userId }, { recipient: userId }]
            }
        },
        {
            $project: {
                friendId: {
                    $cond: { if: { $eq: ["$requester", userId] }, then: "$recipient", else: "$requester" }
                }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "friendId",
                foreignField: "_id",
                as: "friend"
            }
        },
        { $unwind: "$friend" },
        {
            $project: {
                _id: "$friend._id",
                name: "$friend.name",
                email: "$friend.email"
            }
        }
    ]);

    return res.status(200).json({ success: true, count: friends.length, friends });
});

const cancelFriendRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;

    const isRequestPending = await friendRequest.findOne({
        _id: requestId,
        requester: req.user._id,
        status: "pending"
    });

    if (!isRequestPending) {
        return res.status(404).json({
            success: false,
            message: "Pending friend request not found"
        });
    }

    await isRequestPending.deleteOne();

    return res.status(200).json({
        success: true,
        message: "Friend request cancelled successfully"
    });
});

const deleteFriend = asyncHandler(async (req, res) => {
    const { friendId } = req.params;
    const userId = req.user._id;

    if (userId.toString() === friendId) {
        return res.status(400).json({
            success: false,
            message: "You cannot remove yourself"
        });
    }

    const friendship = await friendRequest.findOne({
        status: "accepted",
        $or: [
            { requester: userId, recipient: friendId },
            { requester: friendId, recipient: userId }
        ]
    });

    if (!friendship) {
        return res.status(404).json({
            success: false,
            message: "Friendship not found"
        });
    }

    await friendship.deleteOne();

    return res.status(200).json({
        success: true,
        message: "Friend removed successfully"
    });
});

module.exports = {
    sendFriendRequest,
    getFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends,
    cancelFriendRequest,
    deleteFriend
};
