const express = require('express');
const router = express.Router();
const ExpressError = require('../utils/ExpressError.js');
const Listing = require('../models/listing.js');
const Review = require('../models/review.js');
const { isLoggedIn,isOwner,validateListing} = require('../middleware.js');
const wrapAsync = require('../utils/wrapAsync.js');
const listingController = require('../controllers/listing.js');
const multer = require('multer');
const { storage } = require('../cloudconfig.js');
const upload = multer({ storage: storage });


router
.route("/")
.get(wrapAsync(listingController.index))
.post(
    isLoggedIn,
    validateListing, 
    upload.single('listing[image]'),
    wrapAsync(listingController.createListing)
);

//new route
router.get("/new", isLoggedIn, wrapAsync(listingController.renderNewForm));

router.route("/:id")
.get(wrapAsync(listingController.showListing))

.put(isLoggedIn,
    isOwner,
    upload.single('listing[image]'),
     validateListing, 
     wrapAsync(listingController.updateListing))

.delete(isLoggedIn,
     isOwner,
      wrapAsync(listingController.deleteListing));

//edit route
router.get("/:id/edit", isLoggedIn, wrapAsync(listingController.editListing));
       
module.exports = router;