const bookingForm = document.getElementById("bookingForm");

const checkAvailabilityBtn = document.getElementById("checkAvailabilityBtn");
const availabilityMessage = document.getElementById("availabilityMessage");
const reserveBtn = document.getElementById("reserveBtn");

if (checkAvailabilityBtn) {
    checkAvailabilityBtn.addEventListener("click", async function () {
        const checkIn = document.getElementById("checkIn").value;
        const checkOut = document.getElementById("checkOut").value;

        availabilityMessage.innerHTML = "";
        reserveBtn.disabled = true;

        if (!checkIn || !checkOut) {
            availabilityMessage.innerHTML =
                '<span class="text-danger">Please select check-in and check-out dates.</span>';
            return;
        }

        try {
            checkAvailabilityBtn.disabled = true;
            checkAvailabilityBtn.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin me-2"></i>Checking...';

            const response = await fetch("/payments/check-availability", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    listingId: bookingForm.dataset.listingId,
                    checkIn,
                    checkOut
                })
            });

            const result = await response.json();

            if (result.success && result.available) {
                availabilityMessage.innerHTML =
                    '<span class="text-success fw-semibold"><i class="fa-solid fa-circle-check me-1"></i>Dates are available!</span>';

                reserveBtn.disabled = false;
            } else {
                availabilityMessage.innerHTML =
                    `<span class="text-danger fw-semibold"><i class="fa-solid fa-circle-xmark me-1"></i>${result.message}</span>`;

                reserveBtn.disabled = true;
            }
        } catch (err) {
            console.error("Availability check error:", err);

            availabilityMessage.innerHTML =
                '<span class="text-danger">Unable to check availability.</span>';

            reserveBtn.disabled = true;
        } finally {
            checkAvailabilityBtn.disabled = false;
            checkAvailabilityBtn.innerHTML =
                '<i class="fa-solid fa-calendar-check me-2"></i>Check Availability';
        }
    });
}

if (bookingForm) {
    bookingForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        try {
            const response = await fetch("/payments/create-order", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    listingId: bookingForm.dataset.listingId,
                    checkIn: document.getElementById("checkIn").value,
                    checkOut: document.getElementById("checkOut").value,
                    guests: document.getElementById("guests").value
                })
            });

            const order = await response.json();

            console.log("Create order response:", order);

            if (!response.ok || !order.id) {
                alert(order.message || "Unable to create payment order.");
                return;
            }

            const options = {
                key: "rzp_test_TKuL8K6rZGDLDN",
                amount: order.amount,
                currency: order.currency,
                name: "StayNest",
                description: "Booking Payment",
                order_id: order.id,

                handler: async function (response) {
                    try {
                        const verifyResponse = await fetch("/payments/verify", {
                            method: "POST",
                            credentials: "same-origin",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                listingId: bookingForm.dataset.listingId,
                                checkIn: document.getElementById("checkIn").value,
                                checkOut: document.getElementById("checkOut").value,
                                guests: document.getElementById("guests").value
                            })
                        });

                        const result = await verifyResponse.json();

                        console.log("Payment verification:", result);

                        if (result.success) {
                            window.location.href =
                                `/payments/success/${result.bookingId}`;
                        } else {
                            alert(
                                result.message ||
                                "Payment Verification Failed"
                            );
                        }
                    } catch (err) {
                        console.error("Verification error:", err);
                        alert("Verification Error");
                    }
                },

                theme: {
                    color: "#fe424d"
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();

        } catch (err) {
            console.error("Create order error:", err);
            alert("Unable to create order.");
        }
    });
}