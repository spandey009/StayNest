const Notification = require("../models/notification");

module.exports.createNotification = async ({
    user,
    sender,
    booking,
    listing,
    title,
    message,
    type = "general"
}) => {

    const notification = new Notification({

        user,
        sender,
        booking,
        listing,
        title,
        message,
        type

    });

    await notification.save();

    return notification;

};


module.exports.getNotifications = async (req, res) => {

    try {

        const notifications = await Notification.find({

            user: req.user._id

        })
            .populate("sender")
            .populate("booking")
            .populate("listing")
            .sort({ createdAt: -1 });

        res.render("notifications/index", {

            notifications

        });

    } catch (err) {

        console.log(err);

        req.flash("error", "Unable to load notifications.");

        res.redirect("/");

    }

};


module.exports.markAsRead = async (req, res) => {

    try {

        await Notification.findOneAndUpdate(

            {
                _id: req.params.id,
                user: req.user._id
            },

            {
                isRead: true
            }

        );

        res.redirect("/notifications");

    } catch (err) {

        console.log(err);

        res.redirect("/notifications");

    }

};


module.exports.deleteNotification = async (req, res) => {

    try {

        await Notification.findOneAndDelete({

            _id: req.params.id,
            user: req.user._id

        });

        req.flash("success", "Notification deleted.");

        res.redirect("/notifications");

    } catch (err) {

        console.log(err);

        res.redirect("/notifications");

    }

};

module.exports.openNotification = async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            user: req.user._id
        })
        .populate("booking")
        .populate("listing");

        if (!notification) {
            req.flash("error", "Notification not found.");
            return res.redirect("/notifications");
        }

        notification.isRead = true;
        await notification.save();

        if (notification.type === "booking" && notification.booking) {
            return res.redirect(`/trips/${notification.booking._id}`);
        }

        switch (notification.type) {
            case "payment":
                return res.redirect("/trips");
            case "review":
                if (notification.listing) {
                    return res.redirect(`/listings/${notification.listing._id}`);
                }
                return res.redirect("/listings");
            default:
                return res.redirect("/notifications");
        }
    } catch (err) {
        console.log("Open notification error:", err);
        req.flash("error", "Unable to open notification.");
        res.redirect("/notifications");
    }
};

module.exports.markAllRead = async (req, res) => {

    try {

        await Notification.updateMany(

            {
                user: req.user._id,
                isRead: false
            },

            {
                isRead: true
            }

        );

        req.flash("success", "All notifications marked as read.");

        res.redirect("/notifications");

    } catch (err) {

        console.log(err);

        req.flash("error", "Unable to mark notifications as read.");

        res.redirect("/notifications");

    }

};