const mongoose = require("mongoose");
const Booking = require("../models/booking");
const Listing = require("../models/listing");
const User = require("../models/user");
const notificationController = require("./notification");
const razorpay = require("../config/razorpay");
const { calculateRefund } = require("../utils/refundPolicy");

module.exports.createBookingRecord = async (bookingData) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { listing, checkIn, checkOut } = bookingData;
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        if (
            Number.isNaN(checkInDate.getTime()) ||
            Number.isNaN(checkOutDate.getTime()) ||
            checkInDate >= checkOutDate
        ) {
            throw new Error("Invalid booking dates.");
        }

        const overlappingBooking = await Booking.findOne({
            listing,
            status: "Confirmed",
            checkIn: { $lt: checkOutDate },
            checkOut: { $gt: checkInDate }
        })
        .session(session)
        .select("_id checkIn checkOut");

        if (overlappingBooking) {
            throw new Error("These dates are no longer available.");
        }

        const booking = new Booking({
            ...bookingData,
            checkIn: checkInDate,
            checkOut: checkOutDate
        });

        await booking.save({ session });

        const listingDoc = await Listing.findById(listing).session(session);

        if (!listingDoc) {
            throw new Error("Listing not found.");
        }

        listingDoc.bookings.push(booking._id);
        await listingDoc.save({ session });

        const user = await User.findById(booking.user).session(session);

        if (!user) {
            throw new Error("User not found.");
        }

        user.bookings.push(booking._id);
        await user.save({ session });

        await session.commitTransaction();

        return booking;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        await session.endSession();
    }
};
// =======================================
// Old Route (temporary)
// =======================================

module.exports.createBooking = async (req, res) => {

    const { id } = req.params;

    const booking = await module.exports.createBookingRecord({

        listing: id,

        user: req.user._id,

        checkIn: req.body.checkIn,

        checkOut: req.body.checkOut,

        guests: req.body.guests,

        nights: req.body.nights,

        totalPrice: req.body.totalPrice

    });

    req.flash("success", "Booking Confirmed 🎉");

    res.redirect("/trips");

};

module.exports.showBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId)
            .populate("user")
            .populate({
                path: "listing",
                populate: {
                    path: "owner"
                }
            });

        if (!booking) {
            req.flash("error", "Booking not found.");
            return res.redirect("/trips");
        }

        const isGuest = booking.user._id.equals(req.user._id);
        const isHost = booking.listing.owner._id.equals(req.user._id);

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
        req.flash("error", "Unable to load booking.");
        res.redirect("/trips");
    }
};

//cancel booking
module.exports.cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId)
            .populate("listing");

        if (!booking) {
            req.flash("error", "Booking not found.");
            return res.redirect("/trips");
        }

        if (!booking.user.equals(req.user._id)) {
            req.flash("error", "You are not authorized to cancel this booking.");
            return res.redirect("/trips");
        }

        if (booking.status === "Cancelled") {
            req.flash("error", "This booking is already cancelled.");
            return res.redirect("/trips");
        }

        if (booking.status !== "Confirmed") {
            req.flash("error", "This booking cannot be cancelled.");
            return res.redirect("/trips");
        }

        if (!booking.listing) {
            req.flash("error", "Property associated with this booking was not found.");
            return res.redirect("/trips");
        }

        const { refundPercentage, refundAmount } = calculateRefund({
            policy: booking.listing.cancellationPolicy,
            totalPrice: booking.totalPrice,
            checkIn: booking.checkIn
        });

        // No refund required
        if (refundAmount === 0) {
            booking.status = "Cancelled";
            booking.refundStatus = "Processed";
            booking.refundedAmount = 0;
            booking.refundedAt = new Date();

            await booking.save();

            if (
                booking.listing.owner &&
                !booking.listing.owner.equals(req.user._id)
            ) {
                await notificationController.createNotification({
                    user: booking.listing.owner,
                    sender: req.user._id,
                    booking: booking._id,
                    listing: booking.listing._id,
                    title: "Booking Cancelled",
                    message: `A guest cancelled their booking for "${booking.listing.title}". No refund was applicable.`,
                    type: "booking"
                });
            }

            await notificationController.createNotification({
                user: req.user._id,
                sender: booking.listing.owner,
                booking: booking._id,
                listing: booking.listing._id,
                title: "Booking Cancelled",
                message: "Your booking has been cancelled. No refund was applicable under the cancellation policy.",
                type: "booking"
            });

            req.flash(
                "success",
                `Booking cancelled. Refund: ${refundPercentage}%`
            );

            return res.redirect("/trips");
        }

        // Paid booking required for refund
        if (!booking.paymentId || booking.paymentStatus !== "Paid") {
            req.flash(
                "error",
                "This booking cannot be refunded because a captured payment was not found."
            );

            return res.redirect("/trips");
        }

        // Prevent duplicate refund
        if (
            booking.refundStatus === "Pending" ||
            booking.refundStatus === "Processed"
        ) {
            req.flash(
                "error",
                "A refund has already been initiated for this booking."
            );

            return res.redirect("/trips");
        }

        // Mark refund as pending before calling Razorpay
        booking.refundStatus = "Pending";
        await booking.save();

        try {
            const refund = await razorpay.payments.refund(
                booking.paymentId,
                {
                    amount: Math.round(refundAmount * 100),
                    receipt: `refund_${booking._id}`,
                    notes: {
                        bookingId: booking._id.toString(),
                        reason: "Booking cancellation"
                    }
                }
            );

            booking.status = "Cancelled";
            booking.refundId = refund.id;
            booking.refundedAmount = refundAmount;

            // Razorpay may return a pending refund.
            if (refund.status === "processed") {
                booking.paymentStatus = "Refunded";
                booking.refundStatus = "Processed";
                booking.refundedAt = new Date();
            } else {
                booking.refundStatus = "Pending";
            }

            await booking.save();
        } catch (refundError) {
            console.log("Razorpay refund error:", refundError);

            booking.refundStatus = "Failed";
            await booking.save();

            req.flash(
                "error",
                "Cancellation could not be completed because the refund failed."
            );

            return res.redirect("/trips");
        }

        // Notify host
        if (
            booking.listing.owner &&
            !booking.listing.owner.equals(req.user._id)
        ) {
            await notificationController.createNotification({
                user: booking.listing.owner,
                sender: req.user._id,
                booking: booking._id,
                listing: booking.listing._id,
                title: "Booking Cancelled",
                message: `A guest cancelled their booking for "${booking.listing.title}".`,
                type: "booking"
            });
        }

        // Notify guest
        await notificationController.createNotification({
            user: req.user._id,
            sender: booking.listing.owner,
            booking: booking._id,
            listing: booking.listing._id,
            title: "Booking Cancelled",
            message: booking.refundStatus === "Processed"
                ? `Your booking has been cancelled. ₹${refundAmount} has been refunded.`
                : `Your booking has been cancelled. Your ₹${refundAmount} refund is being processed.`,
            type: "payment"
        });

        if (booking.refundStatus === "Processed") {
            req.flash(
                "success",
                `Booking cancelled successfully. ₹${refundAmount} refunded.`
            );
        } else {
            req.flash(
                "success",
                `Booking cancelled successfully. ₹${refundAmount} refund is being processed.`
            );
        }

        return res.redirect("/trips");
    } catch (err) {
        console.log("Cancel booking error:", err);
        req.flash("error", "Unable to cancel booking.");
        return res.redirect("/trips");
    }
};