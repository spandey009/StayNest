const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const bookingController = require("./booking");
const Listing = require("../models/listing");
const Booking = require("../models/booking");
const PaymentRecovery = require("../models/paymentRecovery");
const { calculateBookingDetails } = require("../utils/bookingPrice");
const notificationController = require("./notification");


function parseBookingDate(value) {
    if (!value) return null;

    if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
        const [day, month, year] = value.split("-").map(Number);
        const date = new Date(year, month - 1, day);

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null;
        }

        return date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
module.exports.checkAvailability = async (req, res) => {
    try {
        const { listingId, checkIn, checkOut } = req.body;

        if (!listingId || !checkIn || !checkOut) {
            return res.status(400).json({
                success: false,
                message: "Please select check-in and check-out dates."
            });
        }

        const listing = await Listing.findById(listingId);

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: "Listing not found."
            });
        }

        const checkInDate = parseBookingDate(checkIn);
        const checkOutDate = parseBookingDate(checkOut);

        if (
            !checkInDate ||
            !checkOutDate ||
            checkInDate >= checkOutDate
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid check-in or check-out dates."
            });
        }

        const overlappingBooking = await Booking.findOne({
            listing: listingId,
            status: "Confirmed",
            checkIn: { $lt: checkOutDate },
            checkOut: { $gt: checkInDate }
        }).select("_id");

        if (overlappingBooking) {
            return res.status(409).json({
                success: false,
                available: false,
                message: "These dates are no longer available."
            });
        }

        return res.status(200).json({
            success: true,
            available: true,
            message: "These dates are available."
        });
    } catch (err) {
        console.log("Availability check error:", err);
        return res.status(500).json({
            success: false,
            message: "Unable to check availability."
        });
    }
};
// Create Razorpay Order
module.exports.createOrder = async (req, res) => {
    try {
        const { listingId, checkIn, checkOut, guests } = req.body;
        const guestCount = Number(guests);

        if (!Number.isInteger(guestCount) || guestCount < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid number of guests."
            });
        }

        const listing = await Listing.findById(listingId);

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: "Listing not found"
            });
        }

        const checkInDate = parseBookingDate(checkIn);
        const checkOutDate = parseBookingDate(checkOut);

        if (
            !checkInDate ||
            !checkOutDate ||
            checkInDate >= checkOutDate
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid check-in or check-out dates."
            });
        }

        // Check existing confirmed bookings
        const overlappingBooking = await Booking.findOne({
            listing: listingId,
            status: "Confirmed",
            checkIn: { $lt: checkOutDate },
            checkOut: { $gt: checkInDate }
        }).select("_id checkIn checkOut");

        if (overlappingBooking) {
            return res.status(409).json({
                success: false,
                message: "These dates are no longer available."
            });
        }

        const bookingDetails = calculateBookingDetails(
            listing.price,
            checkInDate,
            checkOutDate
        );

        if (
            !bookingDetails ||
            !Number.isFinite(bookingDetails.totalPrice) ||
            bookingDetails.totalPrice <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking amount."
            });
        }

        const options = {
            amount: Math.round(bookingDetails.totalPrice * 100),
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: {
                userId: req.user._id.toString(),
                listingId: listingId.toString(),
                checkIn: checkInDate.toISOString(),
                checkOut: checkOutDate.toISOString(),
                guests: guestCount.toString()
            }
        };

        const order = await razorpay.orders.create(options);

        return res.status(200).json({
            ...order,
            nights: bookingDetails.nights,
            roomPrice: bookingDetails.roomPrice,
            cleaningFee: bookingDetails.cleaningFee,
            serviceFee: bookingDetails.serviceFee,
            totalPrice: bookingDetails.totalPrice
        });
    } catch (err) {
        console.log("Create Razorpay order error:", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Unable to create order"
        });
    }
};
// Verify Razorpay Payment
module.exports.verifyPayment = async (req, res) => {
    try {
 console.log("VERIFY PAYMENT BODY:", req.body);
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            listingId,
            checkIn,
            checkOut,
            guests
        } = req.body;

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature ||
            !listingId ||
            !checkIn ||
            !checkOut ||
            !guests
        ) {
            return res.status(400).json({
                success: false,
                message: "Incomplete payment or booking information."
            });
        }

        // Verify Razorpay signature
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

       
        if (
    typeof razorpay_signature !== "string" ||
    razorpay_signature.length !== generatedSignature.length ||
    !crypto.timingSafeEqual(
        Buffer.from(generatedSignature, "utf8"),
        Buffer.from(razorpay_signature, "utf8")
    )
) {
    return res.status(400).json({
        success: false,
        message: "Invalid Signature"
    });
}

        // Find listing
        const listing = await Listing.findById(listingId);

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: "Listing not found"
            });
        }

        // Validate dates
      const checkInDate = parseBookingDate(checkIn);
const checkOutDate = parseBookingDate(checkOut);

if (
    !checkInDate ||
    !checkOutDate ||
    checkInDate >= checkOutDate
) {
    return res.status(400).json({
        success: false,
        message: "Invalid check-in or check-out dates."
    });
}
        // Validate guests
        const guestCount = Number(guests);

        if (!Number.isInteger(guestCount) || guestCount < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid number of guests."
            });
        }

        // Calculate booking amount on server
        const bookingDetails = calculateBookingDetails(
            listing.price,
            checkInDate,
            checkOutDate
        );

        if (
            !bookingDetails ||
            !Number.isFinite(bookingDetails.totalPrice) ||
            bookingDetails.totalPrice <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking amount."
            });
        }

        // Fetch the actual Razorpay order
        const razorpayOrder = await razorpay.orders.fetch(
            razorpay_order_id
        );

        if (!razorpayOrder) {
            return res.status(400).json({
                success: false,
                message: "Razorpay order not found."
            });
        }

        // Verify order ID
        if (razorpayOrder.id !== razorpay_order_id) {
            return res.status(400).json({
                success: false,
                message: "Invalid Razorpay order."
            });
        }

        // Verify currency
        if (razorpayOrder.currency !== "INR") {
            return res.status(400).json({
                success: false,
                message: "Invalid payment currency."
            });
        }

        // Verify amount
        const expectedAmount = Math.round(
            bookingDetails.totalPrice * 100
        );

        if (Number(razorpayOrder.amount) !== expectedAmount) {
            return res.status(400).json({
                success: false,
                message: "Payment amount does not match booking amount."
            });
        }

        // Prevent duplicate payment processing
        const existingBooking = await Booking.findOne({
            paymentId: razorpay_payment_id
        });

        if (existingBooking) {
            return res.status(200).json({
                success: true,
                bookingId: existingBooking._id,
                alreadyProcessed: true
            });
        }

        // Create booking
        let booking;

        try {
            booking = await bookingController.createBookingRecord({
                listing: listingId,
                user: req.user._id,
                checkIn: checkInDate,
                checkOut: checkOutDate,
                guests: guestCount,
                nights: bookingDetails.nights,
                totalPrice: bookingDetails.totalPrice,
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                paymentStatus: "Paid",
                paidAt: new Date()
            });
        } catch (err) {
            // Handle duplicate payment/order race condition
            if (
                err.code === 11000 &&
                (
                    err.keyPattern?.paymentId ||
                    err.keyPattern?.orderId
                )
            ) {
                const duplicateBooking = await Booking.findOne({
                    $or: [
                        { paymentId: razorpay_payment_id },
                        { orderId: razorpay_order_id }
                    ]
                });

                if (duplicateBooking) {
                    return res.status(200).json({
                        success: true,
                        bookingId: duplicateBooking._id,
                        alreadyProcessed: true
                    });
                }
            }

            throw err;
        }
  console.log("BOOKING CREATED:", booking._id);
        // Notify guest
        await notificationController.createNotification({
            user: req.user._id,
            sender: listing.owner,
            booking: booking._id,
            listing: listing._id,
            title: "Booking Confirmed 🎉",
            message: `Your booking for "${listing.title}" has been confirmed successfully.`,
            type: "booking"
        });

        // Notify host
        if (
            listing.owner &&
            !listing.owner.equals(req.user._id)
        ) {
            await notificationController.createNotification({
                user: listing.owner,
                sender: req.user._id,
                booking: booking._id,
                listing: listing._id,
                title: "New Booking 🎉",
                message: `A guest booked your property "${listing.title}".`,
                type: "booking"
            });
        }

        return res.status(200).json({
            success: true,
            bookingId: booking._id
        });
        } catch (err) {
    console.log("Payment verification error:", err);
    if (err.message === "These dates are no longer available.") {
        return res.status(409).json({
            success: false,
            message: err.message
        });
    }
    if (err.message === "Invalid booking dates.") {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    if (err.message === "Listing not found.") {
        return res.status(404).json({
            success: false,
            message: err.message
        });
    }
    if (err.message === "User not found.") {
        return res.status(404).json({
            success: false,
            message: err.message
        });
    }
    return res.status(500).json({
        success: false,
        message: "Unable to complete booking."
    });
}
};

// Render Payment Success Page
module.exports.renderSuccessPage = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId)
            .populate("listing")
            .populate("user");

        if (!booking) {
            req.flash("error", "Booking not found.");
            return res.redirect("/trips");
        }

        // Only the guest or property owner can view this booking.
        const isGuest = booking.user &&
            booking.user._id.equals(req.user._id);

        const isHost = booking.listing &&
            booking.listing.owner &&
            booking.listing.owner.equals(req.user._id);

        if (!isGuest && !isHost) {
            req.flash("error", "You are not authorized to view this booking.");
            return res.redirect("/trips");
        }

        res.render("payments/success", {
            booking
        });
    } catch (err) {
        console.log("Payment success page error:", err);
        req.flash("error", "Something went wrong.");
        res.redirect("/trips");
    }
};
module.exports.handleWebhook = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers["x-razorpay-signature"];

        if (!webhookSecret || !signature) {
            return res.status(400).json({
                success: false,
                message: "Invalid webhook request."
            });
        }

        const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(req.body)
    .digest("hex");

        if (
            signature.length !== expectedSignature.length ||
            !crypto.timingSafeEqual(
                Buffer.from(expectedSignature, "utf8"),
                Buffer.from(signature, "utf8")
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid webhook signature."
            });
        }

        const payload = JSON.parse(req.body.toString("utf8"));
const event = payload.event;
const refund = payload.payload?.refund?.entity;

const recovery = refund
    ? await PaymentRecovery.findOne({
        $or: [
            { refundId: refund.id },
            { paymentId: refund.payment_id }
        ]
    })
    : null;

            if (event === "payment.captured") {
    const payment = payload.payload?.payment?.entity;

    if (!payment) {
        return res.status(200).json({
            success: true,
            message: "Payment data missing."
        });
    }

    const existingBooking = await Booking.findOne({
        $or: [
            { paymentId: payment.id },
            { orderId: payment.order_id }
        ]
    });

    if (existingBooking) {
        return res.status(200).json({
            success: true,
            bookingId: existingBooking._id,
            alreadyProcessed: true
        });
    }

    const razorpayOrder = await razorpay.orders.fetch(payment.order_id);
    const notes = razorpayOrder.notes || {};

    if (
        !notes.userId ||
        !notes.listingId ||
        !notes.checkIn ||
        !notes.checkOut ||
        !notes.guests
    ) {
        console.log("Payment webhook: booking information missing.");
        return res.status(200).json({
            success: true,
            message: "Booking information unavailable."
        });
    }

    const listing = await Listing.findById(notes.listingId);

    if (!listing) {
        console.log("Payment webhook: listing not found.");
        return res.status(200).json({
            success: true,
            message: "Listing not found."
        });
    }

    const checkInDate = new Date(notes.checkIn);
    const checkOutDate = new Date(notes.checkOut);
    const guestCount = Number(notes.guests);

    if (
        Number.isNaN(checkInDate.getTime()) ||
        Number.isNaN(checkOutDate.getTime()) ||
        checkInDate >= checkOutDate ||
        !Number.isInteger(guestCount) ||
        guestCount < 1
    ) {
        console.log("Payment webhook: invalid booking data.");
        return res.status(200).json({
            success: true,
            message: "Invalid booking data."
        });
    }

    const bookingDetails = calculateBookingDetails(
        listing.price,
        checkInDate,
        checkOutDate
    );

    if (
        !bookingDetails ||
        !Number.isFinite(bookingDetails.totalPrice) ||
        bookingDetails.totalPrice <= 0
    ) {
        return res.status(200).json({
            success: true,
            message: "Invalid booking amount."
        });
    }

    const expectedAmount = Math.round(
        bookingDetails.totalPrice * 100
    );

    if (Number(payment.amount) !== expectedAmount) {
        console.log("Payment webhook: amount mismatch.");
        return res.status(200).json({
            success: true,
            message: "Payment amount mismatch."
        });
    }

    let booking;

    try {
        booking = await bookingController.createBookingRecord({
            listing: listing._id,
            user: notes.userId,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: guestCount,
            nights: bookingDetails.nights,
            totalPrice: bookingDetails.totalPrice,
            paymentId: payment.id,
            orderId: payment.order_id,
            paymentStatus: "Paid",
            paidAt: new Date()
        });
    
        } catch (err) {
    if (err.message === "These dates are no longer available.") {
        console.log("Payment captured but dates unavailable:", payment.id);
        let recovery = await PaymentRecovery.findOne({ paymentId: payment.id });
        if (!recovery) {
            recovery = await PaymentRecovery.create({
                paymentId: payment.id,
                orderId: payment.order_id,
                user: notes.userId,
                listing: listing._id,
                amount: Number(payment.amount) / 100,
                reason: "Booking dates became unavailable",
                refundStatus: "Pending",
                recoveryStatus: "Pending"
            });
        }
        try {
            const refund = await razorpay.payments.refund(payment.id, {
                amount: Number(payment.amount),
                receipt: `refund_${payment.id}`,
                notes: {
                    reason: "Booking dates became unavailable",
                    paymentId: payment.id,
                    orderId: payment.order_id
                }
            });
            await PaymentRecovery.findByIdAndUpdate(recovery._id, {
                refundId: refund.id,
                refundStatus: "Pending"
            });
            await notificationController.createNotification({
                user: notes.userId,
                sender: listing.owner,
                listing: listing._id,
                title: "Payment Refund Initiated",
                message: `Your payment for "${listing.title}" is being refunded because the selected dates became unavailable.`,
                type: "payment"
            });
        } catch (refundError) {
            console.log("Automatic refund failed:", refundError);
            await PaymentRecovery.findByIdAndUpdate(recovery._id, {
                refundStatus: "Failed",
                recoveryStatus: "Failed"
            });
            await notificationController.createNotification({
                user: notes.userId,
                sender: listing.owner,
                listing: listing._id,
                title: "Refund Requires Attention",
                message: `Your payment for "${listing.title}" was received, but the automatic refund could not be completed. Please contact StayNest support.`,
                type: "payment"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Payment received but booking was unavailable. Refund initiated."
        });
    }
    throw err;
}
    
    await notificationController.createNotification({
        user: notes.userId,
        sender: listing.owner,
        booking: booking._id,
        listing: listing._id,
        title: "Booking Confirmed 🎉",
        message: `Your booking for "${listing.title}" has been confirmed successfully.`,
        type: "booking"
    });

    if (
        listing.owner &&
        !listing.owner.equals(notes.userId)
    ) {
        await notificationController.createNotification({
            user: listing.owner,
            sender: notes.userId,
            booking: booking._id,
            listing: listing._id,
            title: "New Booking 🎉",
            message: `A guest booked your property "${listing.title}".`,
            type: "booking"
        });
    }

    return res.status(200).json({
        success: true,
        bookingId: booking._id,
        recovered: true
    });
}

        if (!refund) {
            return res.status(200).json({
                success: true,
                message: "Event ignored."
            });
        }

        const booking = await Booking.findOne({
    $or: [
        { refundId: refund.id },
        { paymentId: refund.payment_id }
    ]
})
.populate("user")
.populate({
    path: "listing",
    populate: {
        path: "owner"
    }
});
if (!booking && recovery) {
    if (event === "refund.created") {
        recovery.refundId = refund.id;
        recovery.refundStatus = "Pending";
        await recovery.save();
        return res.status(200).json({ success: true });
    }

    if (event === "refund.processed") {
        recovery.refundId = refund.id;
        recovery.refundStatus = "Processed";
        recovery.recoveryStatus = "Resolved";
        await recovery.save();

        await notificationController.createNotification({
            user: recovery.user,
            listing: recovery.listing,
            title: "Refund Processed 💰",
            message: `Your refund of ₹${(Number(refund.amount) / 100).toLocaleString("en-IN")} has been processed successfully.`,
            type: "payment"
        });

        return res.status(200).json({ success: true });
    }

    if (event === "refund.failed") {
        recovery.refundId = refund.id;
        recovery.refundStatus = "Failed";
        recovery.recoveryStatus = "Failed";
        await recovery.save();

        await notificationController.createNotification({
            user: recovery.user,
            listing: recovery.listing,
            title: "Refund Failed",
            message: "Your refund could not be processed. Please contact StayNest support.",
            type: "payment"
        });

        return res.status(200).json({ success: true });
    }
}
        if (!booking) {
            console.log("Refund webhook: booking not found", refund.id);

            return res.status(200).json({
                success: true,
                message: "Booking not found."
            });
        }

        if (event === "refund.created") {
            booking.refundId = refund.id;
            booking.refundStatus = "Pending";
            booking.refundedAmount = Number(refund.amount) / 100;

            await booking.save();

            return res.status(200).json({
                success: true
            });
        }

    
        if (event === "refund.processed") {
    const alreadyProcessed =
        booking.refundStatus === "Processed" &&
        booking.refundId === refund.id;

    booking.refundId = refund.id;
    booking.refundStatus = "Processed";
    booking.paymentStatus = "Refunded";
    booking.refundedAmount = Number(refund.amount) / 100;
    booking.refundedAt = booking.refundedAt || new Date();

    await booking.save();

    if (!alreadyProcessed) {
        await notificationController.createNotification({
            user: booking.user._id,
            sender: booking.listing.owner._id,
            booking: booking._id,
            listing: booking.listing._id,
            title: "Refund Processed 💰",
            message: `Your refund of ₹${booking.refundedAmount} has been processed successfully.`,
            type: "payment"
        });
    }

    return res.status(200).json({
        success: true
    });
}

       if (event === "refund.failed") {
    booking.refundId = refund.id;
    booking.refundStatus = "Failed";

    await booking.save();

    await notificationController.createNotification({
        user: booking.user._id,
        sender: booking.listing.owner._id,
        booking: booking._id,
        listing: booking.listing._id,
        title: "Refund Failed",
        message: "Your refund could not be processed. Please contact StayNest support.",
        type: "payment"
    });

    return res.status(200).json({
        success: true
    });
}

        return res.status(200).json({
            success: true,
            message: "Event ignored."
        });
    } catch (err) {
        console.log("Razorpay webhook error:", err);

        return res.status(500).json({
            success: false,
            message: "Webhook processing failed."
        });
    }
};