const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware");
const supportController = require("../controllers/support");

router.get(
    "/",
    isLoggedIn,
    wrapAsync(supportController.showChat)
);

router.post(
    "/conversation",
    isLoggedIn,
    wrapAsync(supportController.createConversation)
);

router.get(
    "/:id/messages",
    isLoggedIn,
    wrapAsync(supportController.getMessages)
);

router.post(
    "/:id/messages",
    isLoggedIn,
    wrapAsync(supportController.sendMessage)
);

router.post(
    "/:id/resolve",
    isLoggedIn,
    wrapAsync(supportController.resolveConversation)
);

module.exports = router;