const bookingForm = document.getElementById("bookingForm");

if (bookingForm) {

    bookingForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        try {

            // Create Razorpay Order
            const response = await fetch("/payments/create-order", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    listingId: bookingForm.dataset.listingId,

                    checkIn: document.getElementById("checkIn").value,

                    checkOut: document.getElementById("checkOut").value

                })

            });

            const order = await response.json();

            if (!order.id) {

                alert("Unable to create payment order.");

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

                        console.log(result);

                        if (result.success) {

                            window.location.href = `/payments/success/${result.bookingId}`;

                        } else {

                            alert(result.message || "Payment Verification Failed");

                        }

                    } catch (err) {

                        console.error(err);

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

            console.error(err);

            alert("Unable to create order.");

        }

    });

}