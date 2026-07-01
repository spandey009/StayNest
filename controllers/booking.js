const Booking = require("../models/booking");
const Listing = require("../models/listing");
const User = require("../models/user");

module.exports.createBooking = async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listings");
    }

    const booking = new Booking({

        listing: listing._id,

        user: req.user._id,

        checkIn: req.body.checkIn,

        checkOut: req.body.checkOut,

        guests: req.body.guests,

        nights: req.body.nights,

        totalPrice: req.body.totalPrice

    });

    await booking.save();

    listing.bookings.push(booking._id);
    await listing.save();

    const user = await User.findById(req.user._id);
    user.bookings.push(booking._id);
    await user.save();

    req.flash("success", "Booking Confirmed 🎉");

    res.redirect("/trips");
};
module.exports.cancelBooking = async (req, res) => {

    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
        req.flash("error", "Booking not found.");
        return res.redirect("/trips");
    }

    if (!booking.user.equals(req.user._id)) {
        req.flash("error", "Unauthorized.");
        return res.redirect("/trips");
    }

    booking.status = "Cancelled";

    await booking.save();

    req.flash("success", "Booking cancelled successfully.");

    res.redirect("/trips");
};