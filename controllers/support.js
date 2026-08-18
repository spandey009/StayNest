const Conversation = require("../models/conversation");
const Message = require("../models/message");
const { generateSupportReply } = require("../services/supportAI");

module.exports.showChat = async (req, res) => {
    let conversation = await Conversation.findOne({
        user: req.user._id,
        status: { $ne: "resolved" }
    }).sort({ updatedAt: -1 });

    if (!conversation) {
        conversation = await Conversation.create({
            user: req.user._id,
            subject: "StayNest Support",
            aiEnabled: true
        });
    }

    const messages = await Message.find({
        conversation: conversation._id
    })
        .sort({ createdAt: 1 })
        .populate("sender", "username profileImage")
        .lean();

    res.render("support/chat", {
        conversation,
        messages
    });
};

module.exports.createConversation = async (req, res) => {
    const subject =
        typeof req.body.subject === "string" &&
        req.body.subject.trim()
            ? req.body.subject.trim().slice(0, 120)
            : "StayNest Support";

    const conversation = await Conversation.create({
        user: req.user._id,
        subject,
        aiEnabled: true
    });

    res.status(201).json({
        success: true,
        conversation
    });
};

module.exports.sendMessage = async (req, res) => {
    try {
        const { id } = req.params;

        const messageText =
            typeof req.body.message === "string"
                ? req.body.message.trim()
                : "";

        if (!messageText) {
            return res.status(400).json({
                success: false,
                message: "Message cannot be empty."
            });
        }

        if (messageText.length > 2000) {
            return res.status(400).json({
                success: false,
                message: "Message is too long."
            });
        }

        const conversation = await Conversation.findOne({
            _id: id,
            user: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found."
            });
        }

        if (conversation.status === "resolved") {
            return res.status(400).json({
                success: false,
                message: "This conversation has been resolved."
            });
        }

        if (conversation.status === "waiting") {
            return res.status(400).json({
                success: false,
                message: "A support agent is currently handling this conversation."
            });
        }

        const newMessage = await Message.create({
            conversation: conversation._id,
            sender: req.user._id,
            senderType: "user",
            message: messageText,
            isRead: false
        });

        conversation.lastMessage = messageText;
        conversation.lastMessageAt = new Date();
        conversation.status = "open";

        await conversation.save();

        const populatedMessage = await Message.findById(newMessage._id)
            .populate("sender", "username profileImage")
            .lean();

        const io = req.app.get("io");

        if (io) {
            io.to(`conversation:${conversation._id}`).emit(
                "new-message",
                populatedMessage
            );
        }

        res.status(201).json({
            success: true,
            message: populatedMessage
        });

        setImmediate(async () => {
    try {
        const io = req.app.get("io");
        await generateSupportReply(conversation._id, io);
    } catch (error) {
        console.error("AI support processing error:", error);
    }
});

    } catch (error) {
        console.error("Support send message error:", error);

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Unable to send message."
            });
        }
    }
};

module.exports.getMessages = async (req, res) => {
    try {
        const { id } = req.params;

        const conversation = await Conversation.findOne({
            _id: id,
            user: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found."
            });
        }

        const messages = await Message.find({
            conversation: conversation._id
        })
            .sort({ createdAt: 1 })
            .populate("sender", "username profileImage")
            .lean();

        res.json({
            success: true,
            messages
        });
    } catch (error) {
        console.error("Get support messages error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load messages."
        });
    }
};

module.exports.resolveConversation = async (req, res) => {
    try {
        const { id } = req.params;

        const conversation = await Conversation.findOne({
            _id: id,
            user: req.user._id
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found."
            });
        }

        conversation.status = "resolved";
        conversation.aiEnabled = false;

        await conversation.save();

        const io = req.app.get("io");

        if (io) {
            io.to(`conversation:${conversation._id}`).emit(
                "conversation-resolved",
                {
                    conversationId: conversation._id
                }
            );
        }

        res.json({
            success: true,
            message: "Chat cleared successfully."
        });
    } catch (error) {
        console.error("Resolve conversation error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to resolve conversation."
        });
    }
};