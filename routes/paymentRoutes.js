const router = require("express").Router();

const auth = require("../middleware/authMiddleware");

const {
  createOrder,
  verifyPayment
} = require("../controllers/paymentController");


router.post("/create-order", auth, createOrder);

router.post("/verify-payment", auth, verifyPayment);


module.exports = router;