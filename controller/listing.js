const Listing = require("../models/listing.js");


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

    if (!listing) {
       req.flash("error", "Listing not found!");
     return res.redirect("/listings");
    }
    // console.log(listing);
    res.render("listings/show.ejs", { listing })};

module.exports.createListing = async (req, res) => {
//    let result = listingSchema.validate(req.body);
//    console.log(result);
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id; // Set the owner to the current user
    await newListing.save();
    req.flash("success", "Successfully made a new listing!");
    res.redirect("/listings");
   }

   module.exports.editListing = async (req, res) => {
       let { id } = req.params;
       const listing = await Listing.findById(id);
       if (!listing) {
           req.flash("error", "Listing not found!");
           return res.redirect("/listings");
       }
       res.render("listings/edit.ejs", { listing });
   }

   module.exports.updateListing = async (req, res) => {
    let { id } = req.params;

    const listingData = req.body.listing;

    listingData.image = {
        filename: "listingimage",
        url: listingData.image
    };

    await Listing.findByIdAndUpdate(id, listingData);

    req.flash("success", "Listing updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.deleteListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Successfully deleted the listing!");
    res.redirect("/listings");
}

