const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const bookingController = require("./booking");
const Listing = require("../models/listing");
const { calculateBookingDetails } = require("../utils/bookingPrice");
const notificationController = require("./notification");

// Create Razorpay Order
module.exports.createOrder = async (req, res) => {
    try {
        const {
            listingId,
            checkIn,
            checkOut
        } = req.body;

        // Find Listing
        const listing = await Listing.findById(listingId);

        if (!listing) {

            return res.status(404).json({

                success: false,

                message: "Listing not found"

            });

        }

        // Calculate Booking Details
        const bookingDetails = calculateBookingDetails(
            listing.price,
            checkIn,
            checkOut
        );

        console.log("Calculated Total:", bookingDetails.totalPrice);

        const options = {

            amount: bookingDetails.totalPrice * 100,

            currency: "INR",

            receipt: `receipt_${Date.now()}`

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

        console.log(err);

        return res.status(500).json({

            success: false,

            message: err.message || "Unable to create order"

        });

    }

};

// Verify Razorpay Payment
module.exports.verifyPayment = async (req, res) => {

    try {

        const {

            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,

            listingId,
            checkIn,
            checkOut,
            guests

        } = req.body;

        
        // Verify Razorpay Signature
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(
                razorpay_order_id + "|" + razorpay_payment_id
            )
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {

            return res.status(400).json({

                success: false,

                message: "Invalid Signature"

            });

        }

        // Find Listing
       
        const listing = await Listing.findById(listingId);

        if (!listing) {

            return res.status(404).json({

                success: false,

                message: "Listing not found"

            });

        }

      
        // Calculate Booking Details
        
        const bookingDetails = calculateBookingDetails(
            listing.price,
            checkIn,
            checkOut
        );

        
        // Prevent Duplicate Booking
        
        const Booking = require("../models/booking");

        const existingBooking = await Booking.findOne({

            paymentId: razorpay_payment_id

        });

        if (existingBooking) {

            return res.status(200).json({

                success: true,

                bookingId: existingBooking._id

            });

        }

       
        // Create Booking
      
        const booking = await bookingController.createBookingRecord({

            listing: listingId,

            user: req.user._id,

            checkIn,

            checkOut,

            guests,

            nights: bookingDetails.nights,

            totalPrice: bookingDetails.totalPrice,

            paymentId: razorpay_payment_id,

            orderId: razorpay_order_id,

            paymentStatus: "Paid",

            paidAt: new Date()

        });
await notificationController.createNotification({

    user: req.user._id,

    title: "Booking Confirmed 🎉",

    message: `Your booking for "${listing.title}" has been confirmed successfully.`,

    type: "booking"

});
        return res.status(200).json({

            success: true,

            bookingId: booking._id

        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({

            success: false,

            message: err.message || "Verification Failed"

        });

    }

};
const Booking = require("../models/booking");

module.exports.renderSuccessPage = async (req, res) => {

    try {

        const booking = await Booking.findById(req.params.bookingId)
            .populate("listing")
            .populate("user");

        if (!booking) {

            req.flash("error", "Booking not found.");

            return res.redirect("/trips");

        }

        res.render("payments/success", {

            booking

        });

    } catch (err) {

        console.log(err);

        req.flash("error", "Something went wrong.");

        res.redirect("/trips");

    }

};