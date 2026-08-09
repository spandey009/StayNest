const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notification");
const { isLoggedIn } = require("../middleware");

// ==========================
// View All Notifications
// ==========================

router.get(
    "/",
    isLoggedIn,
    notificationController.getNotifications
);

// ==========================
// Mark All Notifications as Read
// ==========================

router.put(
    "/mark-all-read",
    isLoggedIn,
    notificationController.markAllRead
);

// ==========================
// Open Notification
// ==========================

router.get(
    "/:id/open",
    isLoggedIn,
    notificationController.openNotification
);

// ==========================
// Mark Single Notification as Read
// ==========================

router.put(
    "/:id/read",
    isLoggedIn,
    notificationController.markAsRead
);

// ==========================
// Delete Notification
// ==========================

router.delete(
    "/:id",
    isLoggedIn,
    notificationController.deleteNotification
);

module.exports = router;