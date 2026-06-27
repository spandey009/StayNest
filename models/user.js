const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// For Node.js v25 compatibility
const passportLocalMongoose =
    require("passport-local-mongoose").default ||
    require("passport-local-mongoose");

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
});

console.log("passportLocalMongoose type:", typeof passportLocalMongoose);

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);