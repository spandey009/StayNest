const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({

    user: {

        type: Schema.Types.ObjectId,

        ref: "User",

        required: true

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

}, {

    timestamps: true

});

module.exports = mongoose.model(
    "Notification",
    notificationSchema
);