module.exports.calculateBookingDetails = (listingPrice, checkIn, checkOut) => {

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const diffTime = checkOutDate - checkInDate;

    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
        throw new Error("Invalid booking dates");
    }

    const cleaningFee = 200;
    const serviceFee = 300;

    const roomPrice = listingPrice * nights;

    const totalPrice =
        roomPrice +
        cleaningFee +
        serviceFee;

    return {

        nights,

        roomPrice,

        cleaningFee,

        serviceFee,

        totalPrice

    };

};