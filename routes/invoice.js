const express = require("express");

const router = express.Router();

const invoiceController = require("../controllers/invoice");

router.get(
    "/:bookingId",
    invoiceController.downloadInvoice
);

module.exports = router;