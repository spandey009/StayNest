const User = require("../models/user");
const Listing = require("../models/listing");

// Toggle Wishlist
module.exports.toggleWishlist = async (req, res) => {

    const { id } = req.params;

    const user = await User.findById(req.user._id);

    const exists = user.wishlist.some(
        listingId => listingId.toString() === id
    );

    if (exists) {

        user.wishlist.pull(id);

        req.flash("success", "Removed from Wishlist ❤️");

    } else {

        user.wishlist.push(id);

        req.flash("success", "Added to Wishlist ❤️");

    }

    await user.save();

    res.redirect("back");
};
// Show Wishlist
module.exports.showWishlist = async (req, res) => {

    const user = await User.findById(req.user._id)
        .populate("wishlist");

    res.render("users/wishlist", {
        wishlist: user.wishlist
    });

};