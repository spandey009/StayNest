
if(process.env.NODE_ENV !== "production"){
    require('dotenv').config();
}
require("dotenv").config();

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const Listing = require('./models/listing.js');
const path = require('path');
const methodOverride = require('method-override');
app.use(methodOverride('_method'));
const ejsMate = require('ejs-mate');
const ejs = require('ejs');
const ExpressError = require('./utils/ExpressError.js');
const wrapAsync = require('./utils/wrapAsync.js');
const { listingSchema,reviewSchema } = require('./schema.js');
const Review = require('./models/review.js');
//const MONGO_URL = "mongodb://127.0.0.1:27017/StayNest";
const dbUrl = process.env.ATLASDB_URL;

const listingRouter = require('./routes/listing.js'); 
const reviewRouter = require('./routes/review.js');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user.js');
const userRouter = require('./routes/user.js');
const wishlistRoutes = require("./routes/wishlist");
const bookingRoutes = require("./routes/booking");
const tripRoutes = require("./routes/trip");

main().then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Error connecting to MongoDB:', err));

async function main() {
    await mongoose.connect(dbUrl);
}

app.engine('ejs', ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


const store = MongoStore.create({
    mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET,
  },
    touchAfter: 24 * 60 * 60
});

store.on("error", function(e){
    console.log("Session Store Error", e);
});

const sessionOptions = {
    store: store,
    secret: process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge:1000 * 60 * 60 * 24 * 7,
        httpOnly:true
    }
};





app.get('/', (req, res) => {
    res.redirect('/listings');
});

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
   // console.log(res.locals.success);
   res.locals.currUser = req.user;
    next();
});

app.get("/demouser", async (req, res) => {
    let fakeuser = new User({
        email: "demo@example.com",
        username: "demouser"
    });
 let registeredUser =  await User.register(fakeuser, "demopassword");
res.send(registeredUser);
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/wishlist", wishlistRoutes);
app.use("/bookings", bookingRoutes);
app.use("/trips", tripRoutes);

app.all('/*splat', wrapAsync(async (req, res, next) => {
    throw new ExpressError(404, "Page Not Found");
}));

app.use((err, req, res, next) => {
    let { statusCode=500 } = err;

    res.status(statusCode).render("error.ejs", { err });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});



