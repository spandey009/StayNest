const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentRecoverySchema = new Schema({
    paymentId: {
        type: String,
        required: true,
        unique: true
    },
    orderId: {
        type: String,
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    reason: {
        type: String,
        required: true
    },
    refundId: {
        type: String,
        sparse: true
    },
    refundStatus: {
        type: String,
        enum: ["Pending", "Processed", "Failed"],
        default: "Pending"
    },
    recoveryStatus: {
        type: String,
        enum: ["Pending", "Resolved", "Failed"],
        default: "Pending"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("PaymentRecovery", paymentRecoverySchema);