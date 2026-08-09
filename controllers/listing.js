const Listing = require("../models/listing.js");
const NodeGeocoder = require("node-geocoder");
const User = require("../models/user");

const geocoder = NodeGeocoder({
    provider: "openstreetmap",
});

module.exports.index = async (req, res) => {

    const { category, search } = req.query;

    let query = {};

    if (category && category !== "Trending") {
        query.category = category;
    }

    if (search) {

        query.$or = [
            { title: { $regex: search, $options: "i" } },
            { location: { $regex: search, $options: "i" } },
            { country: { $regex: search, $options: "i" } }
        ];

    }

    const allListings = await Listing.find(query).populate("owner").populate("reviews");

    let wishlist = [];

if (req.user) {
    const user = await User.findById(req.user._id);
    wishlist = user.wishlist.map(id => id.toString());
}

res.render("listings/index.ejs", {
    allListings,
    category,
    search,
    wishlist,
});

};

module.exports.renderNewForm = (async (req, res) => {
res.render("listings/new.ejs")});

module.exports.showListing = async (req, res) => {
    let { id } = req.params;

    let listing = await Listing.findById(id)
        .populate("owner")
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        });

    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    let wishlist = [];

    if (req.user) {
        const user = await User.findById(req.user._id);
        wishlist = user.wishlist.map(id => id.toString());
    }

    res.render("listings/show.ejs", {
        listing,
        wishlist,
    });
};


module.exports.createListing = async (req, res) => {

    let response = await geocoder.geocode(
    `${req.body.listing.location}, ${req.body.listing.country}`
);

    let url = req.file.path;
    let filename = req.file.filename;

    const newListing = new Listing(req.body.listing);

    newListing.image = {
        url,
        filename
    };

    newListing.owner = req.user._id;

    if (response.length > 0) {
        newListing.geometry = {
            type: "Point",
            coordinates: [response[0].longitude, response[0].latitude]
        };
    }

    await newListing.save();

    req.flash("success", "Successfully made a new listing!");
    res.redirect("/listings");
};


   module.exports.editListing = async (req, res) => {
       let { id } = req.params;
       const listing = await Listing.findById(id);
       if (!listing) {
           req.flash("error", "Listing not found!");
           return res.redirect("/listings");
       }
       res.render("listings/edit.ejs", { listing });
   }

//    module.exports.updateListing = async (req, res) => {
//     let { id } = req.params;

//     const listingData = req.body.listing;

//     if (req.file) {
//         listingData.image = {
//             filename: req.file.filename,
//             url: req.file.path
//         };
//     }
// if(typeof req.file !== 'undefined') {
//    let listing = await Listing.findByIdAndUpdate(id, listingData);
//     let url = req.file ? req.file.path : listing.image.url;
//     let filename = req.file ? req.file.filename : listing.image.filename;
//     listing.image = { url: url, filename: filename };
//     await listing.save();
// }
//     req.flash("success", "Listing updated!");
//     res.redirect(`/listings/${id}`);
// };


module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    let listingData = req.body.listing;

    const response = await geocoder.geocode(
        `${listingData.location}, ${listingData.country}`
    );

    if (response.length > 0) {
        listingData.geometry = {
            type: "Point",
            coordinates: [
                response[0].longitude,
                response[0].latitude,
            ],
        };
    }

    if (req.file) {
        listingData.image = {
            filename: req.file.filename,
            url: req.file.path,
        };
    }

   await Listing.findByIdAndUpdate(id, listingData, {
    runValidators: true,
    new: true
});
    req.flash("success", "Listing updated!");
    res.redirect(`/listings/${id}`);
};
module.exports.deleteListing = async (req, res) => {
    const { id } = req.params;

    await Listing.findByIdAndDelete(id);

    req.flash("success", "Listing deleted successfully!");

    res.redirect("/listings");
};

module.exports.renderCalendar = async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listings");
    }

    res.render("listings/calendar", { listing });

};

module.exports.updateCalendar = async (req, res) => {

    const { id } = req.params;

    let { unavailableDates } = req.body;

    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listings");
    }

    if (!unavailableDates) {
        listing.unavailableDates = [];
    } else {
        console.log("req.body =", req.body);
console.log("unavailableDates =", unavailableDates);
        listing.unavailableDates = unavailableDates
        
            .split(",")
            .map(date => new Date(date.trim()));
    }

    await listing.save();

    req.flash("success", "Availability updated successfully!");

    res.redirect(`/listings/${id}/calendar`);
};