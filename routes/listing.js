const express = require('express');
const router = express.Router();
const ExpressError = require('../utils/ExpressError.js');
const Listing = require('../models/listing.js');
const Review = require('../models/review.js');
const { isLoggedIn,isOwner,validateListing} = require('../middleware.js');
const wrapAsync = require('../utils/wrapAsync.js');
const listingController = require('../controller/listing.js');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });


router
.route("/")
.get(wrapAsync(listingController.index))
// .post(
//     isLoggedIn,
//     validateListing, 
//     upload.single('listing[image]'),
//     wrapAsync(listingController.createListing)
// );
.post(upload.single('listing[image]'), (req, res) => {
    res.send(req.file);
});


//new route
router.get("/new", isLoggedIn, wrapAsync(listingController.renderNewForm));

router.route("/:id")
.get(wrapAsync(listingController.showListing))
.put(isLoggedIn,isOwner, validateListing, wrapAsync(listingController.updateListing))
.delete(isLoggedIn, isOwner, wrapAsync(listingController.deleteListing));

//edit route
router.get("/:id/edit", isLoggedIn, wrapAsync(listingController.editListing));
       
module.exports = router;