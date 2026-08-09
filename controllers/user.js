const User = require("../models/user");
const Listing = require("../models/listing");
const Booking = require("../models/booking");
const Review = require("../models/review");

module.exports.renderSignupForm =  (req, res) => {
    res.render("users/signup.ejs");
}

module.exports.signup = async (req, res, next) => {
    try {
        let { username, email, password } = req.body;

        const newUser = new User({ username, email });
        const registeredUser = await User.register(newUser, password);

        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }

            req.flash("success", "Welcome to StayNest!");
            res.redirect("/listings");
        });

    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
};

module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs");
}
module.exports.login = (req, res) => {
    req.flash("success", "Logged in successfully!");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
}

module.exports.logout =  (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error(err);
            req.flash("error", "Error logging out. Please try again.");
            return res.redirect("/listings");
        }
        req.flash("success", "Logged out successfully!");
        res.redirect("/listings");
    })};

  module.exports.showProfile = async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
        req.flash("error", "User not found!");
        return res.redirect("/listings");
    }

    const listings = await Listing.find({ owner: id });

    const stats = {
        totalListings: listings.length,
        wishlistCount: user.wishlist.length,
        bookingCount: user.bookings.length,
    };

    res.render("users/profile.ejs", {
        user,
        listings,
        stats,
    });
}; 
module.exports.renderEditProfile = async (req, res) => {

    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
        req.flash("error", "User not found!");
        return res.redirect("/listings");
    }

    res.render("users/editProfile.ejs", { user });

};
module.exports.updateProfile = async (req, res) => {

    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
        req.flash("error", "User not found!");
        return res.redirect("/listings");
    }

    const { bio, location, phone } = req.body;

    user.bio = bio;
    user.location = location;
    user.phone = phone;

    // Update profile image if a new one is uploaded
    if (req.file) {
        user.profileImage = {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    await user.save();

    req.flash("success", "Profile updated successfully!");

    res.redirect(`/users/${id}`);
};

module.exports.dashboard = async (req, res) => {

    if (!req.user) {
        req.flash("error", "Please login first!");
        return res.redirect("/login");
    }

    const userId = req.user._id;

    const listings = await Listing.find({ owner: userId })
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            }
        });

    const listingIds = listings.map(listing => listing._id);

    const bookings = await Booking.find({
        listing: { $in: listingIds }
    })
    .populate("listing")
    .populate("user")
    .sort({ createdAt: -1 });

    const reviews = listings.flatMap(listing => listing.reviews);

    const recentReviews = reviews
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

    const totalListings = listings.length;
    const totalBookings = bookings.length;
    const totalReviews = reviews.length;
    const totalRevenue = bookings.reduce((sum, booking) => {
        return booking.status === "Confirmed"
            ? sum + booking.totalPrice
            : sum;
    }, 0);

    res.render("users/dashboard", {
        listings,
        bookings,
        reviews,
        recentReviews,
        totalListings,
        totalBookings,
        totalRevenue,
        totalReviews
    });
};
