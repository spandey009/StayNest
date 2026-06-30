const express = require("express");
const router = express.Router();

const wishlistController = require("../controllers/wishlist");
const { isLoggedIn } = require("../middleware");

// Show Wishlist
router.get(
    "/",
    isLoggedIn,
    wishlistController.showWishlist
);

// Toggle Wishlist (Add/Remove)
router.post(
    "/:id",
    isLoggedIn,
    wishlistController.toggleWishlist
);

module.exports = router;