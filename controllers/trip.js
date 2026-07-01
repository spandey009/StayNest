const User = require("../models/user");

module.exports.showTrips = async (req, res) => {

    const user = await User.findById(req.user._id)
        .populate({
            path: "bookings",
            populate: {
                path: "listing"
            }
        });

    res.render("users/trips", {
        bookings: user.bookings
    });

};