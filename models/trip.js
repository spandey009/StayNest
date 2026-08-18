const mongoose = require("mongoose");
const { Schema } = mongoose;

const tripSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        destination: {
            type: String,
            required: true,
            trim: true
        },

        startDate: {
            type: Date,
            required: true
        },

        endDate: {
            type: Date,
            required: true
        },

        travelers: {
            type: Number,
            required: true,
            min: 1
        },

        budget: {
            type: Number,
            required: true,
            min: 0
        },

        travelStyle: String,

        interests: String,

        preferences: String,

        itinerary: {
            type: Schema.Types.Mixed,
            required: true
        },

        recommendedListings: [
            {
                type: Schema.Types.ObjectId,
                ref: "Listing"
            }
        ],

        expenses: [
            {
                title: {
                    type: String,
                    required: true,
                    trim: true
                },

                category: {
                    type: String,
                    enum: [
                        "Accommodation",
                        "Food",
                        "Transport",
                        "Activities",
                        "Other"
                    ],
                    default: "Other"
                },

                amount: {
                    type: Number,
                    required: true,
                    min: 0
                },

                date: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        isPublic:{type:Boolean,default:false}
    },
    { timestamps: true }
);

module.exports = mongoose.model("Trip", tripSchema);