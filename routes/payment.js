const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/payment");

// Create Razorpay Order
router.post("/create-order", paymentController.createOrder);

// Verify Razorpay Payment
router.post("/verify", paymentController.verifyPayment);
router.get(
    "/success/:bookingId",
    paymentController.renderSuccessPage
);
module.exports = router;