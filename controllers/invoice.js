const PDFDocument = require("pdfkit");
const Booking = require("../models/booking");

module.exports.downloadInvoice = async (req, res) => {

    try {

        const booking = await Booking.findById(req.params.bookingId)
            .populate("listing")
            .populate("user");

        if (!booking) {

            req.flash("error", "Booking not found.");

            return res.redirect("/trips");

        }

        const doc = new PDFDocument();

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=Invoice-${booking._id}.pdf`
        );

        doc.pipe(res);

        doc.fontSize(24)
           .text("StayNest", {
               align: "center"
           });

        doc.moveDown();

        doc.fontSize(18)
           .text("Booking Invoice");

        doc.moveDown();

        doc.fontSize(12);

        doc.text(`Booking ID : ${booking._id}`);

        doc.text(`Payment ID : ${booking.paymentId}`);

        doc.text(`Guest : ${booking.user.username}`);

        doc.text(`Property : ${booking.listing.title}`);

        doc.text(`Check In : ${booking.checkIn.toDateString()}`);

        doc.text(`Check Out : ${booking.checkOut.toDateString()}`);

        doc.text(`Guests : ${booking.guests}`);

        doc.moveDown();

        doc.text(`Total Paid : ₹${booking.totalPrice}`);

        doc.text(`Payment Status : ${booking.paymentStatus}`);

        doc.moveDown();

        doc.fontSize(16)
           .text("Thank you for choosing StayNest ❤️", {

               align: "center"

           });

        doc.end();

    } catch (err) {

        console.log(err);

        req.flash("error", "Unable to generate invoice.");

        res.redirect("/trips");

    }

};