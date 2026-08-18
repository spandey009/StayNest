const express = require("express");
const router = express.Router();

const { isLoggedIn } = require("../middleware");
const tripPlannerController = require("../controllers/tripPlanner");

router.get(
    "/",
    isLoggedIn,
    tripPlannerController.renderPlanner
);

router.post(
    "/generate",
    isLoggedIn,
    tripPlannerController.generateItinerary
);

router.get(
    "/my-trips",
    isLoggedIn,
    tripPlannerController.myTrips
);

router.get(
    "/my-trips/:id",
    isLoggedIn,
    tripPlannerController.showTrip
);
router.post(
    "/my-trips/:id/modify",
    isLoggedIn,
    tripPlannerController.modifyTrip
);
router.post(
    "/my-trips/:id/chat",
    isLoggedIn,
    tripPlannerController.chatTrip
);
router.post(
    "/my-trips/:id/optimize-budget",
    isLoggedIn,
    tripPlannerController.optimizeBudget
);
router.post("/my-trips/:id/expenses",isLoggedIn,tripPlannerController.addExpense);
router.delete("/my-trips/:id/expenses/:expenseId",isLoggedIn,tripPlannerController.deleteExpense);
router.get("/my-trips/:id/insights",isLoggedIn,tripPlannerController.tripInsights);
router.post("/my-trips/:id/share",isLoggedIn,tripPlannerController.shareTrip);
router.get("/shared/:id",tripPlannerController.viewSharedTrip);
router.delete("/my-trips/:id/share",isLoggedIn,tripPlannerController.unshareTrip);

router.delete(
    "/my-trips/:id",
    isLoggedIn,
    tripPlannerController.deleteTrip
);

module.exports = router;