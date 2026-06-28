const Listing = require("../models/listing.js");
const NodeGeocoder = require("node-geocoder");

const geocoder = NodeGeocoder({
    provider: "openstreetmap",
});

module.exports.index = async (req, res) => {
   const allListings = await Listing.find({});
        res.render("listings/index.ejs", { allListings });
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

// console.log("Requested ID:", id);
// console.log("Loaded Title:", listing.title);

    if (!listing) {
       req.flash("error", "Listing not found!");
     return res.redirect("/listings");
    }
    // console.log(listing);
    res.render("listings/show.ejs", { listing })};

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

    await Listing.findByIdAndUpdate(id, listingData);

    req.flash("success", "Listing updated!");
    res.redirect(`/listings/${id}`);
};