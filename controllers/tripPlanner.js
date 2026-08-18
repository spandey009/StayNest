const { GoogleGenAI } = require("@google/genai");
const Listing = require("../models/listing");
const Booking = require("../models/booking");
const Trip = require("../models/trip");
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const isListingAvailable = (listing, checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    return !(listing.unavailableDates || []).some(date => {
        const unavailable = new Date(date);

        return unavailable >= start && unavailable < end;
    });
};
module.exports.renderPlanner = (req, res) => {
    res.render("tripPlanner/index");
};

module.exports.generateItinerary = async (req, res) => {
    try {
        const {
            destination,
            startDate,
            endDate,
            travelers,
            budget,
            travelStyle,
            interests,
            preferences
        } = req.body;

        if (
            !destination ||
            !startDate ||
            !endDate ||
            !travelers ||
            !budget ||
            !travelStyle ||
            !interests
        ) {
            req.flash("error", "Please fill all required trip details.");
            return res.redirect("/trip-planner");
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            end <= start
        ) {
            req.flash("error", "Invalid travel dates.");
            return res.redirect("/trip-planner");
        }

        const days = Math.ceil(
            (end - start) / (1000 * 60 * 60 * 24)
        );

        if (days < 1 || days > 30) {
            req.flash("error", "Trip duration must be between 1 and 30 days.");
            return res.redirect("/trip-planner");
        }

        // Get real StayNest listings for the destination
        const destinationListings = await Listing.find({
    location: {
        $regex: destination.trim(),
        $options: "i"
    }
})
    .select("title description price location country image rating")
    .limit(30)
    .lean();

const requestedStart = new Date(`${startDate}T00:00:00.000Z`);
const requestedEnd = new Date(`${endDate}T00:00:00.000Z`);

const conflictingBookings = await Booking.find({
    status: "Confirmed",
    checkIn: { $lt: requestedEnd },
    checkOut: { $gt: requestedStart },
    listing: {
        $in: destinationListings.map(listing => listing._id)
    }
})
    .select("listing")
    .lean();

const unavailableListingIds = new Set(
    conflictingBookings.map(booking =>
        booking.listing.toString()
    )
);

const listings = destinationListings.filter(listing =>
    !unavailableListingIds.has(listing._id.toString())
);
if (listings.length === 0) {
    req.flash(
        "error",
        `No StayNest properties are available in ${destination} for the selected dates.`
    );

    return res.redirect("/trip-planner");
}


        const listingData = listings.map(listing => ({
            id: listing._id.toString(),
            title: listing.title,
            description: listing.description,
            price: listing.price,
            location: listing.location,
            country: listing.country,
            image: listing.image
        }));

        const prompt = `
You are StayNest AI, an expert travel planner.

Create a personalized ${days}-day trip.

TRIP DETAILS:
Destination: ${destination}
Dates: ${startDate} to ${endDate}
Travelers: ${travelers}
Budget: ₹${budget}
Travel style: ${travelStyle}
Interests: ${interests}
Additional preferences: ${preferences || "None"}

AVAILABLE STAYNEST LISTINGS:
${JSON.stringify(listingData)}

IMPORTANT:
These listings have already been checked against StayNest bookings
for the requested dates.

Only recommend listings from this list.
Never invent a listing.
Never recommend an unavailable listing.

IMPORTANT RULES:
1. Use the supplied StayNest listings when recommending accommodation.
2. Never invent a StayNest listing.
3. Never claim that a listing is available.
4. The backend will verify availability separately.
5. Keep the estimated trip cost within the user's budget when reasonably possible.
6. Create a realistic day-by-day itinerary.
7. Include morning, afternoon and evening activities.
8. Include local food recommendations.
9. Include practical travel tips.
10. Activity costs are estimates, not guaranteed prices.
`;

      
let response;

for (let attempt = 1; attempt <= 3; attempt++) {
    try {
        response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
    type: "object",
    properties: {
        destination: {
            type: "string"
        },

        summary: {
            type: "string"
        },

        recommendedListingIds: {
            type: "array",
            items: {
                type: "string"
            }
        },

        estimatedBudget: {
            type: "object",
            properties: {
                accommodation: {
                    type: "number"
                },

                food: {
                    type: "number"
                },

                transport: {
                    type: "number"
                },

                activities: {
                    type: "number"
                },

                total: {
                    type: "number"
                }
            },

            required: [
                "accommodation",
                "food",
                "transport",
                "activities",
                "total"
            ]
        },

        days: {
            type: "array",

            items: {
                type: "object",

                properties: {
                    day: {
                        type: "number"
                    },

                    date: {
                        type: "string"
                    },

                    morning: {
                        type: "object",

                        properties: {
                            activity: {
                                type: "string"
                            },

                            estimatedCost: {
                                type: "number"
                            }
                        },

                        required: [
                            "activity",
                            "estimatedCost"
                        ]
                    },

                    afternoon: {
                        type: "object",

                        properties: {
                            activity: {
                                type: "string"
                            },

                            estimatedCost: {
                                type: "number"
                            }
                        },

                        required: [
                            "activity",
                            "estimatedCost"
                        ]
                    },

                    evening: {
                        type: "object",

                        properties: {
                            activity: {
                                type: "string"
                            },

                            estimatedCost: {
                                type: "number"
                            }
                        },

                        required: [
                            "activity",
                            "estimatedCost"
                        ]
                    },

                    foodRecommendation: {
                        type: "string"
                    },

                    dailyCost: {
                        type: "number"
                    }
                },

                required: [
                    "day",
                    "date",
                    "morning",
                    "afternoon",
                    "evening",
                    "foodRecommendation",
                    "dailyCost"
                ]
            }
        },

        travelTips: {
            type: "array",
            items: {
                type: "string"
            }
        }
    },

    required: [
        "destination",
        "summary",
        "recommendedListingIds",
        "estimatedBudget",
        "days",
        "travelTips"
    ]
}
              
            }
        });

        break;

    } catch (err) {
        console.error(
            `Gemini attempt ${attempt} failed:`,
            err.status,
            err.message
        );

        if (err.status !== 503 || attempt === 3) {
            throw err;
        }

        await new Promise(resolve =>
            setTimeout(resolve, attempt * 2000)
        );
    }
}

if (!response) {
    throw new Error("Gemini failed after 3 attempts.");
}
    const itinerary = JSON.parse(response.text.trim());

const nightlyBudget =
    Number(budget) / Math.max(days, 1);

const recommendedListings = listings
    .map(listing => {
        let score = 0;

        const price = Number(listing.price || 0);

        if (price <= nightlyBudget) {
            score += 40;
        } else if (price <= nightlyBudget * 1.25) {
            score += 25;
        }

        if (
            listing.location &&
            listing.location
                .toLowerCase()
                .includes(destination.trim().toLowerCase())
        ) {
            score += 30;
        }

        if (
            itinerary.recommendedListingIds &&
            itinerary.recommendedListingIds.includes(
                listing._id.toString()
            )
        ) {
            score += 30;
        }

        return {
            listing,
            score
        };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.listing);


const trip = await Trip.create({
    user: req.user._id,
    destination,
    startDate,
    endDate,
    travelers: Number(travelers),
    budget: Number(budget),
    travelStyle,
    interests,
    preferences,
    itinerary,
    recommendedListings: recommendedListings.map(
        listing => listing._id
    )
});


const nights = days;

const accommodationOptions =
    recommendedListings.map(listing => ({
        listing,
        accommodationCost:
            Number(listing.price || 0) * nights
    }));


const cheapestAccommodation =
    accommodationOptions.length
        ? Math.min(
            ...accommodationOptions.map(
                item => item.accommodationCost
            )
        )
        : 0;


const itineraryCost =
    itinerary.days.reduce(
        (total, day) =>
            total + Number(day.dailyCost || 0),
        0
    );


const actualTripCost =
    cheapestAccommodation + itineraryCost;


const remainingBudget =
    Number(budget) - actualTripCost;


const overBudget =
    actualTripCost > Number(budget);


const budgetSummary = {
    budget: Number(budget),
    accommodation: cheapestAccommodation,
    dailyExpenses: itineraryCost,
    total: actualTripCost,
    remaining: remainingBudget,
    overBudget
};


res.render("tripPlanner/result", {
    itinerary,
    recommendedListings,
    accommodationOptions,
    cheapestAccommodation,
    remainingBudget,
    budgetSummary,
    savedTripId: trip._id,

    trip: {
        destination,
        startDate,
        endDate,
        travelers,
        budget,
        travelStyle,
        interests,
        preferences
    }
});

    } catch (err) {
        console.error("Gemini Trip Planner Error:", err);

        req.flash(
            "error",
            "Unable to generate your itinerary. Please try again."
        );

        return res.redirect("/trip-planner");
    }
};
module.exports.myTrips = async (req, res) => {
    const trips = await Trip.find({
        user: req.user._id
    })
        .populate("recommendedListings")
        .sort({ createdAt: -1 });

    res.render("tripPlanner/myTrips", { trips });
};


module.exports.showTrip = async (req, res) => {
    const trip = await Trip.findOne({
        _id: req.params.id,
        user: req.user._id
    }).populate("recommendedListings");

    if (!trip) {
        req.flash("error", "Trip not found.");
        return res.redirect("/trip-planner/my-trips");
    }

    res.render("tripPlanner/savedTrip", {
        trip,
        itinerary: trip.itinerary,
        recommendedListings: trip.recommendedListings
    });
};

module.exports.modifyTrip = async (req, res) => {
    const { id } = req.params;
    const instruction = req.body.instruction?.trim();

    if (!instruction) {
        req.flash("error", "Please enter a modification.");
        return res.redirect(`/trip-planner/my-trips/${id}`);
    }

    try {
        const trip = await Trip.findOne({
            _id: id,
            user: req.user._id
        });

        if (!trip) {
            req.flash("error", "Trip not found.");
            return res.redirect("/trip-planner/my-trips");
        }

        const prompt = `
You are StayNest AI.

Modify the existing travel itinerary according to the user's request.

CURRENT TRIP:
Destination: ${trip.destination}
Start Date: ${trip.startDate}
End Date: ${trip.endDate}
Travelers: ${trip.travelers}
Budget: ₹${trip.budget}
Travel Style: ${trip.travelStyle}
Interests: ${trip.interests}
Preferences: ${trip.preferences || "None"}

CURRENT ITINERARY:
${JSON.stringify(trip.itinerary)}

USER REQUEST:
${instruction}

RULES:
1. Keep the destination unchanged.
2. Keep the dates unchanged.
3. Keep the traveler count unchanged.
4. Keep the same JSON structure.
5. Modify the itinerary according to the user's request.
6. Keep costs realistic.
7. Keep the total estimated cost within the user's budget when reasonably possible.
8. Keep recommendedListingIds unchanged.
9. Return ONLY valid JSON.
10. Do not return markdown or code fences.
`;

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const updatedItinerary = JSON.parse(
            response.text.trim()
        );

        // Keep the original StayNest listings
        updatedItinerary.recommendedListingIds =
            trip.itinerary.recommendedListingIds;

        trip.itinerary = updatedItinerary;

        await trip.save();

        req.flash(
            "success",
            "Your trip was modified successfully!"
        );

        return res.redirect(
            `/trip-planner/my-trips/${id}`
        );

    } catch (err) {

        console.error(
            "AI Trip Modification Error:",
            err
        );

        req.flash(
            "error",
            "Unable to modify your trip right now."
        );

        return res.redirect(
            `/trip-planner/my-trips/${id}`
        );
    }
};
module.exports.deleteTrip = async (req, res) => {
    const { id } = req.params;

    const trip = await Trip.findOneAndDelete({
        _id: id,
        user: req.user._id
    });

    if (!trip) {
        req.flash("error", "Trip not found.");
        return res.redirect("/trip-planner/my-trips");
    }

    req.flash("success", "Trip deleted successfully.");

    res.redirect("/trip-planner/my-trips");
};

module.exports.chatTrip=async(req,res)=>{
    const {id}=req.params;
    const message=req.body.message?.trim();
    if(!message)return res.status(400).json({reply:"Please enter a message."});
    try{
        const trip=await Trip.findOne({_id:id,user:req.user._id});
        if(!trip)return res.status(404).json({reply:"Trip not found."});

        const expenses=trip.expenses||[];
        const totalSpent=expenses.reduce((sum,e)=>sum+Number(e.amount||0),0);
        const remaining=Number(trip.budget)-totalSpent;

        const prompt=`You are StayNest AI travel assistant.
Trip:
Destination: ${trip.destination}
Dates: ${trip.startDate} to ${trip.endDate}
Travelers: ${trip.travelers}
Planned Budget: ₹${trip.budget}
Actual Spent: ₹${totalSpent}
Remaining Budget: ₹${remaining}
Expenses: ${JSON.stringify(expenses)}
Itinerary: ${JSON.stringify(trip.itinerary)}

User: ${message}

Answer using the actual trip and expense data above.
Do not invent expenses, bookings, or StayNest properties.
If the user asks about remaining money or affordability, calculate using actual expenses.
Be concise and useful.`;

        let response;
        for(let attempt=1;attempt<=3;attempt++){
            try{
                response=await ai.models.generateContent({
                    model:"gemini-3.5-flash",
                    contents:prompt
                });
                break;
            }catch(err){
                if(err.status!==503||attempt===3)throw err;
                await new Promise(resolve=>setTimeout(resolve,attempt*2000));
            }
        }

        return res.json({reply:response.text.trim()});
    }catch(err){
        console.error("AI Trip Chat Error:",err);
        return res.status(500).json({reply:"Sorry, I couldn't process that request right now."});
    }
};

module.exports.optimizeBudget = async (req, res) => {
    const { id } = req.params;

    try {
        const trip = await Trip.findOne({
            _id: id,
            user: req.user._id
        });

        if (!trip) {
            req.flash("error", "Trip not found.");
            return res.redirect("/trip-planner/my-trips");
        }

        const itinerary = trip.itinerary;

        const accommodationListings =
            await Listing.find({
                _id: {
                    $in: itinerary.recommendedListingIds || []
                }
            })
            .select("title price")
            .lean();

        const cheapestAccommodation =
            accommodationListings.length
                ? Math.min(
                    ...accommodationListings.map(
                        listing =>
                            Number(listing.price || 0) *
                            Math.ceil(
                                (
                                    new Date(trip.endDate) -
                                    new Date(trip.startDate)
                                ) /
                                (1000 * 60 * 60 * 24)
                            )
                    )
                )
                : 0;

        const currentDailyCost =
            itinerary.days.reduce(
                (sum, day) =>
                    sum + Number(day.dailyCost || 0),
                0
            );

        const currentTotal =
            cheapestAccommodation +
            currentDailyCost;

        const budget = Number(trip.budget);

        if (currentTotal <= budget) {
            req.flash(
                "success",
                "Your trip is already within budget."
            );

            return res.redirect(
                `/trip-planner/my-trips/${id}`
            );
        }

        const prompt = `
You are StayNest AI budget optimizer.

Optimize the existing itinerary so that the trip fits
within the user's budget.

TRIP:
Destination: ${trip.destination}
Start Date: ${trip.startDate}
End Date: ${trip.endDate}
Travelers: ${trip.travelers}
Budget: ₹${budget}
Travel Style: ${trip.travelStyle}
Interests: ${trip.interests}

CURRENT ACCOMMODATION COST:
₹${cheapestAccommodation}

CURRENT DAILY EXPENSES:
₹${currentDailyCost}

CURRENT TOTAL:
₹${currentTotal}

CURRENT ITINERARY:
${JSON.stringify(itinerary)}

RULES:
1. Keep destination unchanged.
2. Keep dates unchanged.
3. Keep travelers unchanged.
4. Keep the same itinerary JSON structure.
5. Keep recommendedListingIds unchanged.
6. Reduce expensive activities first.
7. Prefer free or low-cost activities.
8. Keep realistic food and transport estimates.
9. Try to bring the total estimated cost below ₹${budget}.
10. Do not remove an entire day.
11. Return ONLY valid JSON.
12. Do not return markdown or code fences.
`;

        let response;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                response =
                    await ai.models.generateContent({
                        model: "gemini-3.5-flash",
                        contents: prompt,
                        config: {
                            responseMimeType:
                                "application/json"
                        }
                    });

                break;

            } catch (err) {

                console.error(
                    `Budget optimization attempt ${attempt} failed:`,
                    err.status,
                    err.message
                );

                if (
                    err.status !== 503 ||
                    attempt === 3
                ) {
                    throw err;
                }

                await new Promise(resolve =>
                    setTimeout(
                        resolve,
                        attempt * 2000
                    )
                );
            }
        }

        if (!response) {
            throw new Error(
                "Gemini failed after 3 attempts."
            );
        }

        const optimizedItinerary =
            JSON.parse(
                response.text.trim()
            );

        // Never allow Gemini to change
        // real StayNest listing IDs.
        optimizedItinerary.recommendedListingIds =
            itinerary.recommendedListingIds;

        trip.itinerary = optimizedItinerary;

        await trip.save();

        req.flash(
            "success",
            "Your itinerary was optimized for your budget!"
        );

        res.redirect(
            `/trip-planner/my-trips/${id}`
        );

    } catch (err) {

        console.error(
            "Budget Optimization Error:",
            err
        );

        req.flash(
            "error",
            "Unable to optimize your trip right now."
        );

        res.redirect(
            `/trip-planner/my-trips/${id}`
        );
    }
};
module.exports.addExpense=async(req,res)=>{
    const {id}=req.params;
    const {title,category,amount,date}=req.body;
    try{
        const trip=await Trip.findOne({_id:id,user:req.user._id});
        if(!trip){
            req.flash("error","Trip not found.");
            return res.redirect("/trip-planner/my-trips");
        }
        if(!title||!amount||Number(amount)<0){
            req.flash("error","Enter valid expense details.");
            return res.redirect(`/trip-planner/my-trips/${id}`);
        }
        trip.expenses.push({title,category,amount:Number(amount),date:date||Date.now()});
        await trip.save();
        req.flash("success","Expense added successfully.");
        res.redirect(`/trip-planner/my-trips/${id}`);
    }catch(err){
        console.error("Add Expense Error:",err);
        req.flash("error","Unable to add expense.");
        res.redirect(`/trip-planner/my-trips/${id}`);
    }
};

module.exports.deleteExpense=async(req,res)=>{
    const {id,expenseId}=req.params;
    try{
        const trip=await Trip.findOne({_id:id,user:req.user._id});
        if(!trip){
            req.flash("error","Trip not found.");
            return res.redirect("/trip-planner/my-trips");
        }
        trip.expenses.pull(expenseId);
        await trip.save();
        req.flash("success","Expense deleted.");
        res.redirect(`/trip-planner/my-trips/${id}`);
    }catch(err){
        console.error("Delete Expense Error:",err);
        req.flash("error","Unable to delete expense.");
        res.redirect(`/trip-planner/my-trips/${id}`);
    }
};
module.exports.tripInsights=async(req,res)=>{
    const {id}=req.params;
    try{
        const trip=await Trip.findOne({_id:id,user:req.user._id});
        if(!trip)return res.status(404).json({error:"Trip not found."});

        const expenses=trip.expenses||[];
        const spent=expenses.reduce((sum,e)=>sum+Number(e.amount||0),0);
        const remaining=Number(trip.budget)-spent;

        const categorySpend=expenses.reduce((obj,e)=>{
            obj[e.category]=(obj[e.category]||0)+Number(e.amount||0);
            return obj;
        },{});

        const prompt=`You are StayNest AI.
Analyze this user's saved trip.

Destination: ${trip.destination}
Travelers: ${trip.travelers}
Budget: ₹${trip.budget}
Spent: ₹${spent}
Remaining: ₹${remaining}
Category spending: ${JSON.stringify(categorySpend)}
Itinerary: ${JSON.stringify(trip.itinerary)}

Give exactly 4 concise travel insights.
Focus on:
1. Spending pattern
2. Remaining budget
3. Itinerary efficiency
4. One practical recommendation

Use actual data only.
Do not invent bookings or properties.
Return ONLY valid JSON in this format:
{"insights":["...","...","...","..."]}`;

        let response;
        for(let attempt=1;attempt<=3;attempt++){
            try{
                response=await ai.models.generateContent({
                    model:"gemini-3.5-flash",
                    contents:prompt,
                    config:{responseMimeType:"application/json"}
                });
                break;
            }catch(err){
                if(err.status!==503||attempt===3)throw err;
                await new Promise(resolve=>setTimeout(resolve,attempt*2000));
            }
        }

        const result=JSON.parse(response.text.trim());

        res.json({
            insights:result.insights,
            spent,
            remaining,
            categorySpend
        });
    }catch(err){
        console.error("Trip Insights Error:",err);
        res.status(500).json({error:"Unable to generate insights."});
    }
};
module.exports.shareTrip=async(req,res)=>{
    const {id}=req.params;
    try{
        const trip=await Trip.findOne({_id:id,user:req.user._id});
        if(!trip){
            req.flash("error","Trip not found.");
            return res.redirect("/trip-planner/my-trips");
        }
        trip.isPublic=true;
        await trip.save();
        req.flash("success","Trip sharing enabled.");
        res.redirect(`/trip-planner/my-trips/${id}`);
    }catch(err){
        console.error("Share Trip Error:",err);
        req.flash("error","Unable to share trip.");
        res.redirect(`/trip-planner/my-trips/${id}`);
    }
};

module.exports.viewSharedTrip=async(req,res)=>{
    const {id}=req.params;
    try{
        const trip=await Trip.findOne({_id:id,isPublic:true})
            .populate("recommendedListings");
        if(!trip)return res.status(404).render("error",{err:{message:"Shared trip not found."}});
        res.render("tripPlanner/sharedTrip",{trip});
    }catch(err){
        console.error("Shared Trip Error:",err);
        res.status(500).render("error",{err});
    }
};
module.exports.unshareTrip=async(req,res)=>{
    const {id}=req.params;
    try{
        const trip=await Trip.findOneAndUpdate(
            {_id:id,user:req.user._id},
            {$set:{isPublic:false}},
            {new:true}
        );
        if(!trip){
            req.flash("error","Trip not found.");
            return res.redirect("/trip-planner/my-trips");
        }
        req.flash("success","Trip is private again.");
        res.redirect(`/trip-planner/my-trips/${id}`);
    }catch(err){
        console.error("Unshare Trip Error:",err);
        req.flash("error","Unable to make trip private.");
        res.redirect(`/trip-planner/my-trips/${id}`);
    }
};