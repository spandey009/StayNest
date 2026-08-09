const User = require("../models/user");

module.exports.showTrips = async (req, res) => {

    const user = await User.findById(req.user._id)
        .populate({
            path: "bookings",
            populate: {
                path: "listing"
            }
        });

    res.render("users/trips", {
        bookings: user.bookings
    });

};
const Booking = require("../models/booking");

module.exports.showBookingDetails = async (req, res) => {

    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
        .populate({
            path: "listing",
            populate: {
                path: "owner"
            }
        })
        .populate("user");

    if (!booking) {

        req.flash("error", "Booking not found.");

        return res.redirect("/trips");

    }

    if (!booking.user._id.equals(req.user._id)) {

        req.flash("error", "Unauthorized.");

        return res.redirect("/trips");

    }

    res.render("trips/bookingDetails", {

        booking

    });

};
