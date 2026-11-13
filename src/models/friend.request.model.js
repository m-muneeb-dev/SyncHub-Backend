const mongoose = require("mongoose");

const friendRequest = new mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, { timestamps: true })

// Speed up received requests query:
friendRequest.index({ recipient: 1, status: 1 });

// Speed up checking existing friendships / requests:
friendRequest.index({ requester: 1, recipient: 1 });

// Prevent duplicate requests between the same users in the same direction:
friendRequest.index({ requester: 1, recipient: 1, status: 1 });


module.exports = mongoose.model('friendRequest', friendRequest)
