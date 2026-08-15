const User = require("../models/user");
const Booking = require("../models/booking");

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

module.exports.showBookingDetails = async (req, res) => {
    try {
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

        const isGuest = booking.user._id.equals(req.user._id);
        const isHost = booking.listing &&
            booking.listing.owner &&
            booking.listing.owner._id.equals(req.user._id);

        if (!isGuest && !isHost) {
            req.flash("error", "You are not authorized to view this booking.");
            return res.redirect("/trips");
        }

        res.render("trips/bookingDetails", {
            booking,
            isHost
        });
    } catch (err) {
        console.log("Booking details error:", err);
        req.flash("error", "Unable to load booking details.");
        res.redirect("/trips");
    }
};