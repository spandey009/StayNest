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
        type: String,
        unique: true,
        sparse: true
    },
    orderId: {
        type: String,
        unique: true,
        sparse: true
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed", "Refunded"],
        default: "Pending"
    },
    paidAt: {
        type: Date
    },
    refundId: {
        type: String,
        sparse: true
    },
    refundStatus: {
        type: String,
        enum: ["Pending", "Processed", "Failed"]
    },
    refundedAmount: {
        type: Number,
        min: 0
    },
    refundedAt: {
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