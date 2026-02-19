const express = require("express");
const router = express.Router();
const passwordResetController = require("../Controllers/passwordResetController");

router.post("/forgot-password", passwordResetController.requestReset);
router.post("/verify-otp", passwordResetController.verifyOtp);
router.post("/reset-password", passwordResetController.resetPassword);
router.post("/resend-otp", passwordResetController.requestReset);

module.exports = router;
