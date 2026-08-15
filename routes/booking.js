const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/booking");
const { isLoggedIn } = require("../middleware");

router.post(
    "/:id",
    isLoggedIn,
    bookingController.createBooking
);

router.get(
    "/:bookingId",
    isLoggedIn,
    bookingController.showBooking
);

router.put(
    "/:bookingId/cancel",
    isLoggedIn,
    bookingController.cancelBooking
);

module.exports = router;