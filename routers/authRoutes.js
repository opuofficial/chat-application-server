const express = require("express");
const router = express.Router();
const {
  signup,
  sendOTP,
  verifyOTP,
  signin,
} = require("../controllers/authController");

router.post("/signup", signup);
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/signin", signin);

module.exports = router;
