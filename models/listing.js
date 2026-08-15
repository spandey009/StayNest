const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const listingSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        url: String,
        filename: String
    },
    price: {
        type: Number,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    unavailableDates: [
        {
            type: Date
        }
    ],
    reviews: {
        type: [Schema.Types.ObjectId],
        ref: "Review"
    },
    bookings: [{
        type: Schema.Types.ObjectId,
        ref: "Booking"
    }],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    geometry: {
        type: {
            type: String,
            enum: ["Point"],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    category: {
        type: String,
        required: true,
        enum: [
            "Trending",
            "Rooms",
            "Cities",
            "Beach",
            "Mountains",
            "Pools",
            "Cabins",
            "Luxury",
            "Camping",
            "Lakefront",
            "Historic"
        ]
    },
    cancellationPolicy: {
        type: String,
        enum: ["Flexible", "Moderate", "Strict"],
        default: "Flexible"
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

listingSchema.virtual("avgRating").get(function () {
    if (!this.reviews || this.reviews.length === 0) {
        return 0;
    }

    const total = this.reviews.reduce((sum, review) => {
        return sum + review.rating;
    }, 0);

    return (total / this.reviews.length).toFixed(1);
});

listingSchema.virtual("reviewCount").get(function () {
    return this.reviews.length;
});

listingSchema.post("findOneAndDelete", async (listing) => {
    if (listing) {
        await Review.deleteMany({
            _id: { $in: listing.reviews }
        });
    }
});

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;