const Notification = require("../models/notification");

// =====================================
// Create Notification
// =====================================

module.exports.createNotification = async ({
    user,
    title,
    message,
    type = "general"
}) => {

    const notification = new Notification({

        user,

        title,

        message,

        type

    });

    await notification.save();

    return notification;

};


// =====================================
// Get All Notifications
// =====================================

module.exports.getNotifications = async (req, res) => {

    try {

        const notifications = await Notification.find({

            user: req.user._id

        })
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


// =====================================
// Mark Notification as Read
// =====================================

module.exports.markAsRead = async (req, res) => {

    try {

        await Notification.findByIdAndUpdate(

            req.params.id,

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


// =====================================
// Delete Notification
// =====================================

module.exports.deleteNotification = async (req, res) => {

    try {

        await Notification.findByIdAndDelete(

            req.params.id

        );

        req.flash("success", "Notification deleted.");

        res.redirect("/notifications");

    } catch (err) {

        console.log(err);

        res.redirect("/notifications");

    }

};
module.exports.openNotification = async (req, res) => {

    try {

        const notification = await Notification.findById(req.params.id);

        if (!notification) {

            req.flash("error", "Notification not found.");

            return res.redirect("/notifications");

        }

        notification.isRead = true;

        await notification.save();

        switch (notification.type) {

            case "booking":
                return res.redirect("/trips");

            case "payment":
                return res.redirect("/trips");

            case "review":
                return res.redirect("/listings");

            default:
                return res.redirect("/notifications");

        }

    } catch (err) {

        console.log(err);

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