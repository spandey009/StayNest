//const { isLoggedIn } = require("./middleware");
const Listing = require("./models/listing");
const { listingSchema } = require("./schema.js");
const ExpressError = require("./utils/ExpressError.js");
const Review = require("./models/review.js");
const { reviewSchema } = require("./schema.js");

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {

        if (req.method === "GET") {
            req.session.redirectUrl = req.originalUrl;
        }

        req.flash("error", "You must be signed in to do that!");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
   if(req.session.redirectUrl){
    res.locals.redirectUrl = req.session.redirectUrl;
    delete req.session.redirectUrl;
   }
   next();
}

module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;

    let listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    if (!listing.owner.equals(res.locals.currUser._id)) {
        req.flash("error", "You do not have permission to do that!");
        return res.redirect(`/listings/${id}`);
    }

    next();
};

module.exports.validateListing = (req, res, next) => {
    let{error} = listingSchema.validate(req.body);
    if (error) {
        let msg = error.details.map(el => el.message).join(",");
        throw new ExpressError(400, msg);
    }
    next();
};

module.exports.validateReview = (req, res, next) => {
let{error} = reviewSchema.validate(req.body);
if (error) {
    let msg = error.details.map(el => el.message).join(",");
    throw new ExpressError(400, msg);
}
next();
};

module.exports.isReviewAuthor = async (req, res, next) => {
    let {id, reviewId } = req.params;

    let review = await Review.findById(reviewId);

    if (!review) {
        req.flash("error", "Review not found!");
        return res.redirect("/listings");
    }

    if (!review.author.equals(res.locals.currUser._id)) {
        req.flash("error", "You do not have permission to delete that review!");
        return res.redirect(`/listings/${id}`);
    }

    next();
};
       