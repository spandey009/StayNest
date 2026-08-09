const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({

    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true
    },

    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    checkIn: {
        type: Date,
        required: true
    },

    checkOut: {
        type: Date,
        required: true
    },

    guests: {
        type: Number,
        required: true,
        min: 1
    },

    nights: {
        type: Number,
        required: true
    },

    totalPrice: {
        type: Number,
        required: true
    },

   

    paymentId: {
        type: String
    },

    orderId: {
        type: String
    },

    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending"
    },

    paidAt: {
        type: Date
    },

    status: {
        type: String,
        default: "Confirmed",
        enum: ["Confirmed", "Cancelled"]
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Booking", bookingSchema);