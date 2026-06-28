const mongoose = require("mongoose");
const Listing = require("../models/listing");
const NodeGeocoder = require("node-geocoder");

const geocoder = NodeGeocoder({
    provider: "openstreetmap",
});

mongoose
    .connect("mongodb://127.0.0.1:27017/StayNest")
    .then(() => console.log("DB Connected"))
    .catch((err) => console.log(err));

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateGeometry() {
    try {
        const listings = await Listing.find({
            $or: [
                { geometry: { $exists: false } },
                { geometry: null },
            ],
        });

        console.log(`Found ${listings.length} listings to update\n`);

        for (const listing of listings) {
            try {
                const response = await geocoder.geocode(
                    `${listing.location}, ${listing.country}`
                );

                if (response.length > 0) {
                    listing.geometry = {
                        type: "Point",
                        coordinates: [
                            response[0].longitude,
                            response[0].latitude,
                        ],
                    };

                    await listing.save();

                    console.log(`✔ Updated: ${listing.title}`);
                } else {
                    console.log(`✘ Location not found: ${listing.title}`);
                }

                // Nominatim rate limit
                await sleep(1200);

            } catch (err) {
                console.log(`❌ Failed: ${listing.title}`);
                console.log(err.message);

                // Error ke baad bhi wait
                await sleep(2000);
            }
        }

        console.log("\n🎉 Geometry update completed!");

    } catch (err) {
        console.log(err);
    } finally {
        mongoose.connection.close();
    }
}

updateGeometry();