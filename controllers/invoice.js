const PDFDocument = require("pdfkit");
const Booking = require("../models/booking");

module.exports.downloadInvoice = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId)
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

        const isGuest = booking.user &&
            booking.user._id.equals(req.user._id);

        const isHost = booking.listing &&
            booking.listing.owner &&
            booking.listing.owner._id.equals(req.user._id);

        if (!isGuest && !isHost) {
            req.flash("error", "You are not authorized to access this invoice.");
            return res.redirect("/trips");
        }

        const doc = new PDFDocument();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=Invoice-${booking._id}.pdf`
        );

        doc.pipe(res);

        doc.fontSize(24).text("StayNest", {
            align: "center"
        });

        doc.moveDown();

        doc.fontSize(18).text("Booking Invoice");

        doc.moveDown();

        doc.fontSize(12);

        doc.text(`Booking ID : ${booking._id}`);
        doc.text(`Payment ID : ${booking.paymentId || "N/A"}`);
        doc.text(`Order ID : ${booking.orderId || "N/A"}`);
        doc.text(`Guest : ${booking.user?.username || booking.user?.email || "N/A"}`);
        doc.text(`Property : ${booking.listing?.title || "N/A"}`);
        doc.text(`Check In : ${booking.checkIn?.toDateString() || "N/A"}`);
        doc.text(`Check Out : ${booking.checkOut?.toDateString() || "N/A"}`);
        doc.text(`Guests : ${booking.guests || 0}`);

        doc.moveDown();

        doc.text(`Booking Amount : ₹${booking.totalPrice || 0}`);
        doc.text(`Payment Status : ${booking.paymentStatus || "N/A"}`);
        doc.text(`Booking Status : ${booking.status || "N/A"}`);

        if (booking.refundStatus) {
            doc.moveDown();
            doc.text(`Refund Status : ${booking.refundStatus}`);
            doc.text(`Refund Amount : ₹${booking.refundedAmount || 0}`);

            if (booking.refundId) {
                doc.text(`Refund ID : ${booking.refundId}`);
            }

            if (booking.refundedAt) {
                doc.text(`Refunded On : ${booking.refundedAt.toDateString()}`);
            }
        }

        doc.moveDown();

        doc.fontSize(16).text("Thank you for choosing StayNest ❤️", {
            align: "center"
        });

        doc.end();
    } catch (err) {
        console.log("Invoice generation error:", err);
        req.flash("error", "Unable to generate invoice.");
        return res.redirect("/trips");
    }
};