
const mongoose = require("mongoose");

const SharedTaskSchema = new mongoose.Schema(
    {
        task_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: true
        },
        collaborator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        shared_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "in-progress", "completed"],
            default: "pending"
        }
    },
    { timestamps: true }
);

SharedTaskSchema.index({ task_id: 1, collaborator: 1 }, { unique: true });
SharedTaskSchema.index({ collaborator: 1 });
SharedTaskSchema.index({ shared_by: 1 });

module.exports = mongoose.model("SharedTask", SharedTaskSchema);
