
if(process.env.NODE_ENV !== "production"){
    require('dotenv').config();
}
require("dotenv").config();


const express = require('express');
const app = express();
const mongoose = require('mongoose');
const Listing = require('./models/listing.js');
const path = require('path');
const paymentRoutes = require("./routes/payment");
const paymentController = require("./controllers/payment");
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
console.log("MongoDB Host:", new URL(dbUrl).hostname);
console.log("MongoDB Database:", new URL(dbUrl).pathname);

const moment = require("moment");
const invoiceRoutes = require("./routes/invoice");
const notificationRoutes = require("./routes/notification");
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
//console.log("ATLASDB_URL:", process.env.ATLASDB_URL);

main()
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error(err));

async function main() {
    await mongoose.connect(dbUrl);
}

app.engine('ejs', ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));

app.post(
    "/payments/webhook",
    express.raw({ type: "application/json" }),
    paymentController.handleWebhook
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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
    saveUninitialized:false,
    cookie: {
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
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

const Notification = require("./models/notification");

app.use(async (req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    res.locals.moment = moment;
    res.locals.unreadNotifications = 0;
    res.locals.latestNotifications = [];

    if (!req.user) {
        return next();
    }

    try {
        const [unreadNotifications, latestNotifications] = await Promise.all([
            Notification.countDocuments({
                user: req.user._id,
                isRead: false
            }),
            Notification.find({
                user: req.user._id
            })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean()
        ]);

        res.locals.unreadNotifications = unreadNotifications;
        res.locals.latestNotifications = latestNotifications;

        next();
    } catch (err) {
        console.log("Notification middleware error:", err);
        next();
    }
});

app.get("/demouser", async (req, res) => {
    let fakeuser = new User({
        email: "demo@example.com",
        username: "demouser"
    });
 let registeredUser =  await User.register(fakeuser, "demopassword");
res.send(registeredUser);
});
app.get("/env-test", (req, res) => {
    res.json({
        node: process.version,
        cloud_name: process.env.CLOUD_NAME,
        api_key: process.env.CLOUD_API_KEY,
        secret_exists: !!process.env.CLOUD_API_SECRET
    });
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/wishlist", wishlistRoutes);
app.use("/bookings", bookingRoutes);
app.use("/trips", tripRoutes);
app.use("/payments", paymentRoutes);
app.use("/invoice", invoiceRoutes);
app.use("/notifications", notificationRoutes);

app.all('/*splat', wrapAsync(async (req, res, next) => {
    throw new ExpressError(404, "Page Not Found");
}));

app.use((err, req, res, next) => {
    let { statusCode=500 } = err;

    res.status(statusCode).render("error.ejs", { err });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});