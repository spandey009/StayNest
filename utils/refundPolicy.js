module.exports.calculateRefund = ({
    policy,
    totalPrice,
    checkIn
}) => {
    const now = new Date();
    const checkInDate = new Date(checkIn);

    const hoursUntilCheckIn =
        (checkInDate - now) / (1000 * 60 * 60);

    let refundPercentage = 0;

    switch (policy) {
        case "Flexible":
            refundPercentage = hoursUntilCheckIn >= 24 ? 100 : 0;
            break;

        case "Moderate":
            if (hoursUntilCheckIn >= 120) {
                refundPercentage = 100;
            } else if (hoursUntilCheckIn >= 24) {
                refundPercentage = 50;
            } else {
                refundPercentage = 0;
            }
            break;

        case "Strict":
            refundPercentage = hoursUntilCheckIn >= 168 ? 50 : 0;
            break;

        default:
            refundPercentage = 0;
    }

    const refundAmount =
        Math.round((totalPrice * refundPercentage) / 100);

    return {
        refundPercentage,
        refundAmount
    };
};