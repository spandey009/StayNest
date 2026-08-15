const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment");
const { isLoggedIn } = require("../middleware");

router.post(
    "/check-availability",
    isLoggedIn,
    paymentController.checkAvailability
);

router.post(
    "/create-order",
    isLoggedIn,
    paymentController.createOrder
);

router.post(
    "/verify",
    isLoggedIn,
    paymentController.verifyPayment
);

router.post(
    "/webhook",
    paymentController.handleWebhook
);

router.get(
    "/success/:bookingId",
    isLoggedIn,
    paymentController.renderSuccessPage
);

module.exports = router;