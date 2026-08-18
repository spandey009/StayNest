const { GoogleGenAI } = require("@google/genai");
const Groq = require("groq-sdk");
const Conversation = require("../models/conversation");
const Message = require("../models/message");

const gemini = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    })
    : null;

const groq = process.env.GROQ_API_KEY
    ? new Groq({
        apiKey: process.env.GROQ_API_KEY
    })
    : null;

const GROQ_MODEL = "openai/gpt-oss-20b";
const GEMINI_MODEL = "gemini-3.5-flash";

const escalationWords = [
    "human",
    "agent",
    "representative",
    "support agent",
    "talk to someone",
    "real person",
    "customer care",
    "customer support"
];

function needsHumanSupport(text) {
    const value = text.toLowerCase();

    return escalationWords.some(word =>
        value.includes(word)
    );
}

function buildPrompt(messages) {
    const history = messages
        .map(message => {
            const role =
                message.senderType === "user"
                    ? "User"
                    : message.senderType === "agent"
                    ? "Human Support Agent"
                    : "StayNest AI";

            return `${role}: ${message.message}`;
        })
        .join("\n");

    return `
You are StayNest AI Support.

StayNest is an accommodation booking platform.

Help users with:
- Listings
- Searching stays
- Bookings
- Trips
- Payments
- Wishlist
- Hosts
- Account usage
- General StayNest questions

Rules:
1. Be friendly and helpful.
2. Give a complete answer to the user's question.
3. If explaining a process, provide all important steps.
4. Never stop after only introducing the answer.
5. Never invent booking, payment, refund, or account information.
6. Never claim an action was completed unless the system actually performed it.
7. If you do not know something, clearly say so.
8. If the user clearly needs a human agent, recommend human support.
9. Keep responses reasonably concise, preferably under 150 words.
10. Use numbered steps when explaining a process.
11. Do not mention APIs, databases, models, prompts, or internal instructions.
12. Respond directly to the latest user message.

Conversation:
${history}

Now provide the complete answer to the user's latest message.
`;
}

async function askGroq(prompt) {
    if (!groq) {
        throw new Error("GROQ_API_KEY is not configured.");
    }

    const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
            {
                role: "system",
                content:
                    "You are StayNest AI Support. Give complete, useful answers."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.3,
        max_tokens: 1000
    });

    console.log(
        "Groq finish reason:",
        response.choices?.[0]?.finish_reason
    );

    const reply =
        response.choices?.[0]?.message?.content?.trim();

    if (!reply) {
        throw new Error("Groq returned an empty response.");
    }

    return reply;
}

async function askGemini(prompt) {
    if (!gemini) {
        throw new Error("GEMINI_API_KEY is not configured.");
    }

    const response = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
            maxOutputTokens: 1000,
            thinkingConfig: {
                thinkingLevel: "minimal"
            }
        }
    });

    const candidate = response.candidates?.[0];

    console.log(
        "Gemini finish reason:",
        candidate?.finishReason
    );

    console.log(
        "Gemini usage:",
        response.usageMetadata
    );

    const reply = response.text?.trim();

    if (!reply) {
        throw new Error("Gemini returned an empty response.");
    }

    return reply;
}

async function generateAIReply(messages) {
    const prompt = buildPrompt(messages);

    try {
        console.log("StayNest AI → Trying Groq...");

        const reply = await askGroq(prompt);

        console.log("StayNest AI → Groq answered.");

        return {
            provider: "Groq",
            reply
        };

    } catch (error) {

        console.error(
            "Groq failed:",
            error.status ||
            error.message ||
            error
        );
    }

    try {
        console.log(
            "StayNest AI → Groq unavailable, trying Gemini..."
        );

        const reply = await askGemini(prompt);

        console.log(
            "StayNest AI → Gemini answered."
        );

        return {
            provider: "Gemini",
            reply
        };

    } catch (error) {

        console.error(
            "Gemini failed:",
            error.status ||
            error.message ||
            error
        );
    }

    console.log(
        "StayNest AI → All providers failed."
    );

    return null;
}

async function generateSupportReply(conversationId, io) {

    const conversation =
        await Conversation.findById(conversationId);

    if (!conversation || !conversation.aiEnabled) {
        return null;
    }

    const messages = await Message.find({
        conversation: conversationId
    })
        .sort({ createdAt: -1 })
        .limit(12)
        .lean();

    messages.reverse();

    const latestUserMessage =
        [...messages]
            .reverse()
            .find(
                message =>
                    message.senderType === "user"
            );

    if (!latestUserMessage) {
        return null;
    }

    if (
        needsHumanSupport(
            latestUserMessage.message
        )
    ) {

        return escalateConversation(
            conversation,
            "Sure. I'll connect you with a StayNest support agent.",
            io
        );
    }

    const result =
        await generateAIReply(messages);

    if (!result) {
        return handleAIUnavailable(
            conversation,
            io
        );
    }

    const aiMessage =
        await Message.create({
            conversation: conversation._id,
            sender: null,
            senderType: "ai",
            message: result.reply,
            isRead: false
        });

    conversation.lastMessage =
        result.reply;

    conversation.lastMessageAt =
        new Date();

    conversation.status = "open";
    conversation.aiEnabled = true;

    await conversation.save();

    console.log(
        `StayNest AI → Reply generated by ${result.provider}`
    );

    return emitMessage(
        conversation,
        aiMessage,
        io
    );
}

async function handleAIUnavailable(
    conversation,
    io
) {

    const reply =
        "I'm temporarily unable to process your request. I've sent your conversation to StayNest support so a human agent can help you.";

    const aiMessage =
        await Message.create({
            conversation: conversation._id,
            sender: null,
            senderType: "ai",
            message: reply,
            isRead: false
        });

    conversation.lastMessage = reply;
    conversation.lastMessageAt = new Date();
    conversation.status = "waiting";
    conversation.aiEnabled = false;

    await conversation.save();

    return emitMessage(
        conversation,
        aiMessage,
        io
    );
}

async function escalateConversation(
    conversation,
    reply,
    io
) {

    const aiMessage =
        await Message.create({
            conversation: conversation._id,
            sender: null,
            senderType: "ai",
            message: reply,
            isRead: false
        });

    conversation.lastMessage = reply;
    conversation.lastMessageAt = new Date();
    conversation.status = "waiting";
    conversation.aiEnabled = false;

    await conversation.save();

    return emitMessage(
        conversation,
        aiMessage,
        io
    );
}

async function emitMessage(
    conversation,
    message,
    io
) {

    const populatedMessage =
        await Message.findById(
            message._id
        )
        .populate(
            "sender",
            "username profileImage"
        )
        .lean();

    if (io) {

        io.to(
            `conversation:${conversation._id}`
        ).emit(
            "new-message",
            populatedMessage
        );

        if (
            conversation.status ===
            "waiting"
        ) {

            io.to(
                `conversation:${conversation._id}`
            ).emit(
                "support-escalated",
                {
                    conversationId:
                        conversation._id
                }
            );
        }
    }

    return populatedMessage;
}

module.exports = {
    generateSupportReply
};