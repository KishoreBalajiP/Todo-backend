const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/User");

// NEW: Redis import
const { redisClient } = require("../config/redis");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


// CREATE ORDER (₹49 premium unlock)
exports.createOrder = async (req, res) => {
  try {

    const options = {
      amount: 4900, // ₹49 (amount in paise)
      currency: "INR",
      receipt: `premium_${req.user}`,
    };

    const order = await razorpay.orders.create(options);

    res.json(order);

  } catch (err) {

    console.error("ORDER ERROR:", err);

    res.status(500).json({
      message: "Order creation failed",
    });

  }
};



// VERIFY PAYMENT
exports.verifyPayment = async (req, res) => {

  try {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;


    // PREVENT DOUBLE PROCESSING SAME PAYMENT
    const existingPayment = await redisClient.get(
      `payment:${razorpay_payment_id}`
    );

    if (existingPayment) {
      return res.status(400).json({
        message: "Payment already processed",
      });
    }


    // VERIFY SIGNATURE
    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        razorpay_order_id + "|" + razorpay_payment_id
      )
      .digest("hex");


    if (expectedSignature !== razorpay_signature) {

      return res.status(400).json({
        message: "Payment verification failed",
      });

    }


    // ACTIVATE PREMIUM
    await User.findByIdAndUpdate(req.user, {
      subscriptionActive: true,
    });


    // CACHE SUBSCRIPTION STATUS (FAST ACCESS)
    await redisClient.set(
      `subscription:${req.user}`,
      "active",
      { EX: 30 * 24 * 60 * 60 } // 30 days cache
    );


    // MARK PAYMENT AS USED (ANTI-REPLAY)
    await redisClient.set(
      `payment:${razorpay_payment_id}`,
      "verified",
      { EX: 30 * 24 * 60 * 60 }
    );


    res.json({
      message: "Premium activated successfully",
    });

  } catch (err) {

    console.error("VERIFY ERROR:", err);

    res.status(500).json({
      message: "Verification error",
    });

  }
};