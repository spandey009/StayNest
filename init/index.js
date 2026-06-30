const mongoose = require("mongoose");
const NodeGeocoder = require("node-geocoder");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/StayNest";

const geocoder = NodeGeocoder({
    provider: "openstreetmap",
});

main()
.then(() => {
    console.log("Connected to MongoDB");
    initDB();
})
.catch((err) => console.log(err));

async function main() {
    await mongoose.connect(MONGO_URL);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const initDB = async () => {

    await Listing.deleteMany({});

    let listings = [];

    for (let obj of initData.data) {

        try {

            const response = await geocoder.geocode(
                `${obj.location}, ${obj.country}`
            );

            if (response.length > 0) {
                obj.geometry = {
                    type: "Point",
                    coordinates: [
                        response[0].longitude,
                        response[0].latitude
                    ]
                };
            }

            obj.owner = "6a3fb1a8c796f9a5a0a18c90";

            listings.push(obj);

            console.log(`✔ ${obj.title}`);

            await delay(2000);

        } catch (err) {

            console.log(`✘ ${obj.title}`);

            console.log(err.message);
        }

    }

    await Listing.insertMany(listings);

    console.log("Database initialized successfully.");

    mongoose.connection.close();
};