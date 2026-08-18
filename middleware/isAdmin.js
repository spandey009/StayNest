module.exports.isAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "Please login first.");
        return res.redirect("/login");
    }

    if (!req.user.isAdmin) {
        req.flash(
            "error",
            "You don't have permission to access the admin panel."
        );

        return res.redirect("/listings");
    }

    next();
};