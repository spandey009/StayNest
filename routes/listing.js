const express = require("express");
const router = express.Router();

const Listing = require("../models/listing.js");
const Review = require("../models/review.js");

const {
    isLoggedIn,
    isOwner,
    validateListing
} = require("../middleware.js");

const wrapAsync = require("../utils/wrapAsync.js");
const listingController = require("../controllers/listing.js");

const multer = require("multer");
const { storage } = require("../cloudconfig.js");

const upload = multer({ storage });


/* =========================================
   ALL LISTINGS
   ========================================= */

router.get(
    "/all",
    wrapAsync(listingController.allListings)
);


/* =========================================
   NEW LISTING
   ========================================= */

router.get(
    "/new",
    isLoggedIn,
    wrapAsync(listingController.renderNewForm)
);


/* =========================================
   LISTINGS INDEX + CREATE
   ========================================= */

router
    .route("/")
    .get(
        wrapAsync(listingController.index)
    )
    .post(
        isLoggedIn,
        validateListing,
        upload.single("listing[image]"),
        wrapAsync(listingController.createListing)
    );


/* =========================================
   EDIT LISTING
   ========================================= */

router.get(
    "/:id/edit",
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.editListing)
);


/* =========================================
   CALENDAR
   ========================================= */

router.get(
    "/:id/calendar",
    isLoggedIn,
    wrapAsync(listingController.renderCalendar)
);

router.post(
    "/:id/calendar",
    isLoggedIn,
    wrapAsync(listingController.updateCalendar)
);


/* =========================================
   SHOW / UPDATE / DELETE LISTING
   ========================================= */

router
    .route("/:id")
    .get(
        wrapAsync(listingController.showListing)
    )
    .put(
        isLoggedIn,
        isOwner,
        upload.single("listing[image]"),
        validateListing,
        wrapAsync(listingController.updateListing)
    )
    .delete(
        isLoggedIn,
        isOwner,
        wrapAsync(listingController.deleteListing)
    );


module.exports = router;