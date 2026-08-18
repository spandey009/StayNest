const User = require("../models/user");
const Listing = require("../models/listing");
const Booking = require("../models/booking");
const Review = require("../models/review");
const Conversation = require("../models/conversation");
const Message = require("../models/message");

const escapeRegex = value =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getSearchFilter = search => {
    if (!search) return {};
    const safe = escapeRegex(search);
    return {
        $or: [
            { username: { $regex: safe, $options: "i" } },
            { email: { $regex: safe, $options: "i" } }
        ]
    };
};

module.exports.dashboard = async (req, res) => {
    const userSearch =
        typeof req.query.userSearch === "string"
            ? req.query.userSearch.trim()
            : "";

    const listingSearch =
        typeof req.query.listingSearch === "string"
            ? req.query.listingSearch.trim()
            : "";

    const bookingStatus =
        typeof req.query.bookingStatus === "string"
            ? req.query.bookingStatus.trim()
            : "";

    const supportStatus =
        typeof req.query.supportStatus === "string"
            ? req.query.supportStatus.trim()
            : "";

    const userFilter = getSearchFilter(userSearch);

    const listingFilter = {};

    if (listingSearch) {
        const safe = escapeRegex(listingSearch);

        listingFilter.$or = [
            { title: { $regex: safe, $options: "i" } },
            { location: { $regex: safe, $options: "i" } },
            { country: { $regex: safe, $options: "i" } },
            { category: { $regex: safe, $options: "i" } }
        ];
    }

    const bookingFilter = {};

    if (
        bookingStatus &&
        ["Confirmed", "Cancelled"].includes(bookingStatus)
    ) {
        bookingFilter.status = bookingStatus;
    }

    const supportFilter = {};

    if (
        supportStatus &&
        ["open", "waiting", "resolved"].includes(supportStatus)
    ) {
        supportFilter.status = supportStatus;
    }

    const [
        totalUsers,
        totalListings,
        totalBookings,
        totalReviews,
        totalConversations,
        openSupport,
        waitingSupport,
        resolvedSupport
    ] = await Promise.all([
        User.countDocuments(),
        Listing.countDocuments(),
        Booking.countDocuments(),
        Review.countDocuments(),
        Conversation.countDocuments(),
        Conversation.countDocuments({ status: "open" }),
        Conversation.countDocuments({ status: "waiting" }),
        Conversation.countDocuments({ status: "resolved" })
    ]);

    const [
        revenueResult,
        users,
        listings,
        bookings,
        reviews,
        conversations
    ] = await Promise.all([
        Booking.aggregate([
            {
                $group: {
                    _id: null,
                    paidRevenue: {
                        $sum: {
                            $cond: [
                                { $eq: ["$paymentStatus", "Paid"] },
                                "$totalPrice",
                                0
                            ]
                        }
                    },
                    refundedAmount: {
                        $sum: {
                            $ifNull: ["$refundedAmount", 0]
                        }
                    }
                }
            }
        ]),

        User.find(userFilter)
            .sort({ joinedAt: -1 })
            .limit(20)
            .select(
                "username email profileImage joinedAt isAdmin location"
            )
            .lean(),

        Listing.find(listingFilter)
            .populate("owner", "username email")
            .sort({ _id: -1 })
            .limit(15)
            .lean(),

        Booking.find(bookingFilter)
            .populate("user", "username email")
            .populate(
                "listing",
                "title location price owner"
            )
            .sort({ createdAt: -1 })
            .limit(15)
            .lean(),

        Review.find({})
            .populate("author", "username email")
            .sort({ createdAt: -1 })
            .limit(15)
            .lean(),

        Conversation.find(supportFilter)
            .populate(
                "user",
                "username email profileImage"
            )
            .populate(
                "assignedAgent",
                "username email"
            )
            .sort({
                lastMessageAt: -1,
                updatedAt: -1
            })
            .limit(15)
            .lean()
    ]);

    const paidRevenue =
        revenueResult[0]?.paidRevenue || 0;

    const refundedAmount =
        revenueResult[0]?.refundedAmount || 0;

    const netRevenue =
        paidRevenue - refundedAmount;

    res.render("admin/admin", {
        totalUsers,
        totalListings,
        totalBookings,
        totalReviews,
        totalConversations,
        openSupport,
        waitingSupport,
        resolvedSupport,
        paidRevenue,
        refundedAmount,
        netRevenue,
        users,
        listings,
        bookings,
        reviews,
        conversations,
        userSearch,
        listingSearch,
        bookingStatus,
        supportStatus,
        currentUserId: String(req.user._id)
    });
};

module.exports.toggleAdmin = async (req, res) => {
    const { id } = req.params;

    if (String(req.user._id) === String(id)) {
        req.flash(
            "error",
            "You cannot change your own admin role."
        );

        return res.redirect("/admin");
    }

    const user = await User.findById(id);

    if (!user) {
        req.flash("error", "User not found.");
        return res.redirect("/admin");
    }

    if (user.isAdmin) {
        const adminCount =
            await User.countDocuments({
                isAdmin: true
            });

        if (adminCount <= 1) {
            req.flash(
                "error",
                "You cannot remove the last admin."
            );

            return res.redirect("/admin");
        }
    }

    user.isAdmin = !user.isAdmin;

    await user.save();

    req.flash(
        "success",
        user.isAdmin
            ? `${user.username} is now an admin.`
            : `${user.username} is no longer an admin.`
    );

    res.redirect("/admin");
};

module.exports.deleteListing = async (req, res) => {
    const { id } = req.params;

    const listing =
        await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found.");
        return res.redirect("/admin");
    }

    if (
        listing.bookings &&
        listing.bookings.length > 0
    ) {
        req.flash(
            "error",
            "This listing has booking records and cannot be deleted from the admin panel."
        );

        return res.redirect("/admin");
    }

    await Listing.findByIdAndDelete(id);

    req.flash(
        "success",
        "Listing deleted successfully."
    );

    res.redirect("/admin");
};

module.exports.deleteReview = async (req, res) => {
    const { id } = req.params;

    const review =
        await Review.findById(id);

    if (!review) {
        req.flash("error", "Review not found.");
        return res.redirect("/admin");
    }

    await Listing.updateMany(
        { reviews: review._id },
        {
            $pull: {
                reviews: review._id
            }
        }
    );

    await Review.findByIdAndDelete(id);

    req.flash(
        "success",
        "Review deleted successfully."
    );

    res.redirect("/admin");
};

module.exports.cancelBooking = async (req, res) => {
    const { id } = req.params;

    const booking =
        await Booking.findById(id);

    if (!booking) {
        req.flash("error", "Booking not found.");
        return res.redirect("/admin");
    }

    if (booking.status === "Cancelled") {
        req.flash(
            "error",
            "This booking is already cancelled."
        );

        return res.redirect("/admin");
    }

    req.flash(
        "error",
        "Use the existing booking cancellation/payment flow to cancel this booking so refunds and payment records remain consistent."
    );

    res.redirect("/admin");
};

module.exports.getConversationMessages = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const conversation =
            await Conversation.findById(id)
                .populate(
                    "user",
                    "username email profileImage"
                )
                .populate(
                    "assignedAgent",
                    "username email"
                )
                .lean();

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found."
            });
        }

        const messages =
            await Message.find({
                conversation: id
            })
                .sort({ createdAt: 1 })
                .populate(
                    "sender",
                    "username profileImage"
                )
                .lean();

        res.json({
            success: true,
            conversation,
            messages
        });
    } catch (error) {
        console.error(
            "Admin conversation messages error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to load conversation."
        });
    }
};

module.exports.resolveConversation = async (
    req,
    res
) => {
    const { id } = req.params;

    const conversation =
        await Conversation.findById(id);

    if (!conversation) {
        req.flash(
            "error",
            "Conversation not found."
        );

        return res.redirect("/admin");
    }

    conversation.status = "resolved";
    conversation.aiEnabled = false;

    await conversation.save();

    const io = req.app.get("io");

    if (io) {
        io.to(
            `conversation:${conversation._id}`
        ).emit(
            "conversation-resolved",
            {
                conversationId:
                    conversation._id
            }
        );
    }

    req.flash(
        "success",
        "Support conversation resolved."
    );

    res.redirect("/admin");
};

module.exports.deleteConversation = async (
    req,
    res
) => {
    const { id } = req.params;

    const conversation =
        await Conversation.findById(id);

    if (!conversation) {
        req.flash(
            "error",
            "Conversation not found."
        );

        return res.redirect("/admin");
    }

    await Message.deleteMany({
        conversation: conversation._id
    });

    await Conversation.findByIdAndDelete(id);

    const io = req.app.get("io");

    if (io) {
        io.to(
            `conversation:${conversation._id}`
        ).emit(
            "conversation-deleted",
            {
                conversationId:
                    conversation._id
            }
        );
    }

    req.flash(
        "success",
        "Support conversation deleted."
    );

    res.redirect("/admin");
};