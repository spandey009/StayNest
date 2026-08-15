const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        sender: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },

        booking: {
            type: Schema.Types.ObjectId,
            ref: "Booking"
        },

        listing: {
            type: Schema.Types.ObjectId,
            ref: "Listing"
        },

        title: {
            type: String,
            required: true
        },

        message: {
            type: String,
            required: true
        },

        type: {
            type: String,
            enum: [
                "booking",
                "payment",
                "review",
                "listing",
                "general"
            ],
            default: "general"
        },

        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Notification",
    notificationSchema
);