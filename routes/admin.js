const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isAdmin } = require("../middleware/isAdmin");
const adminController = require("../controllers/admin");

router.use(isAdmin);

router.get(
    "/",
    wrapAsync(adminController.dashboard)
);

router.post(
    "/users/:id/toggle-admin",
    wrapAsync(adminController.toggleAdmin)
);

router.post(
    "/listings/:id/delete",
    wrapAsync(adminController.deleteListing)
);

router.post(
    "/reviews/:id/delete",
    wrapAsync(adminController.deleteReview)
);

router.post(
    "/bookings/:id/cancel",
    wrapAsync(adminController.cancelBooking)
);

router.get(
    "/support/:id/messages",
    wrapAsync(
        adminController.getConversationMessages
    )
);

router.post(
    "/support/:id/resolve",
    wrapAsync(
        adminController.resolveConversation
    )
);

router.post(
    "/support/:id/delete",
    wrapAsync(
        adminController.deleteConversation
    )
);

module.exports = router;