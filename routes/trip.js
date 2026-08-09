const express = require("express");
const router = express.Router();

const tripController = require("../controllers/trip");
const { isLoggedIn } = require("../middleware");

router.get("/", isLoggedIn, tripController.showTrips);

router.get(
    "/:bookingId",
    isLoggedIn,
    tripController.showBookingDetails
);

module.exports = router;