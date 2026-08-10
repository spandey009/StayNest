const express = require('express');
const router = express.Router();
const User = require('../models/user.js'); 
const wrapAsync = require('../utils/wrapAsync.js');
const passport = require('passport');
const { saveRedirectUrl } = require('../middleware.js');
const userController = require('../controllers/user.js');

const multer = require("multer");
const { storage } = require("../cloudconfig");
const upload = multer({ storage });


router.route("/signup")
.get(userController.renderSignupForm)
.post(wrapAsync(userController.signup));

router.route("/login")
.get(userController.renderLoginForm)
.post(saveRedirectUrl, 
    passport.authenticate("local", { failureRedirect: "/login", failureFlash: true }),
    userController.login
);

router.route("/logout")
.get(userController.logout);

router.get("/users/:id", wrapAsync(userController.showProfile));

router.route("/users/:id/edit")
.get(wrapAsync(userController.renderEditProfile))
.put(
    upload.single("profileImage"),
    wrapAsync(userController.updateProfile)
);

router.get(
    "/dashboard",
    wrapAsync(userController.dashboard)
);

module.exports = router;
