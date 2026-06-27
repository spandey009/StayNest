const mongoose = require('mongoose');
const initData = require('./data.js');
const Listing = require('../models/listing.js');

const MONGO_URL = "mongodb://127.0.0.1:27017/StayNest";

main()
  .then(() => {
    console.log('Connected to MongoDB');
    initDB();
  })
  .catch((err) => {
    console.error(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
  await Listing.deleteMany({});

  const data = initData.data.map((obj) => ({
    ...obj,
    owner: "6a3fb1a8c796f9a5a0a18c90"
  }));

  await Listing.insertMany(data);

  console.log("Database initialized with sample data");
};
