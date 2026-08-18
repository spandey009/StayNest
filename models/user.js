const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const passportLocalMongoose =
    require("passport-local-mongoose").default ||
    require("passport-local-mongoose");

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },

    profileImage: {
        url: {
            type: String,
            default:
                "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"
        },

        filename: {
            type: String,
            default: ""
        }
    },

    bio: {
        type: String,
        default: ""
    },

    location: {
        type: String,
        default: ""
    },

    phone: {
        type: String,
        default: ""
    },

    joinedAt: {
        type: Date,
        default: Date.now
    },

    wishlist: [
        {
            type: Schema.Types.ObjectId,
            ref: "Listing"
        }
    ],

    bookings: [
        {
            type: Schema.Types.ObjectId,
            ref: "Booking"
        }
    ],

    isAdmin: {
        type: Boolean,
        default: false
    }
});


UserSchema.plugin(passportLocalMongoose);


module.exports = mongoose.model("User", UserSchema);