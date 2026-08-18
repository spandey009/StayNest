const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    senderType: {
        type: String,
        enum: ["user", "ai", "agent"],
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

messageSchema.index({
    conversation: 1,
    createdAt: 1
});

module.exports = mongoose.model("Message", messageSchema);