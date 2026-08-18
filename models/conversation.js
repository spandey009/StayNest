const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    assignedAgent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true
    },
    status: {
        type: String,
        enum: ["open", "waiting", "resolved"],
        default: "open",
        index: true
    },
    subject: {
        type: String,
        default: "StayNest Support",
        trim: true,
        maxlength: 120
    },
    lastMessage: {
        type: String,
        default: "",
        maxlength: 2000
    },
    lastMessageAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    aiEnabled: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

conversationSchema.index({
    user: 1,
    status: 1,
    updatedAt: -1
});

conversationSchema.index({
    assignedAgent: 1,
    status: 1,
    updatedAt: -1
});

module.exports = mongoose.model("Conversation", conversationSchema);