const PasswordReset = require("../Models/passwordResetModel");
const nodemailer = require("nodemailer");
const dotenv =require("dotenv");
dotenv.config();

// Email Transporter Setup
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 1. Request Reset OTP
exports.requestReset = async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ message: "Valid email is required." });
  }

  try {
    const otp = PasswordReset.generateResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const resetId = await PasswordReset.createOrUpdateResetToken(email, otp, expiresAt);

    if (resetId) {
      await transporter.sendMail({
        from: `Court Info System <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Password Reset OTP",
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Password Reset Request</h2>
            <p>Dear user,</p>
            <p>Your One-Time Password (OTP) for resetting your password is:</p>
            <h3 style="color: #007BFF;">${otp}</h3>
            <p>This OTP will expire in <strong>15 minutes</strong>.</p>
            <p>If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
    }

    res.status(200).json({ message: "If the email exists, an OTP has been sent." });
  } catch (error) {
    console.error("Error in requestReset:", error);
    res.status(500).json({ message: "Internal server error. Please try again." });
  }
};

// 2. Verify OTP
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const isValid = await PasswordReset.verifyOtp(email, otp);

    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    res.status(200).json({ message: "OTP verified successfully." });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    res.status(500).json({ message: "Verification failed. Please try again." });
  }
};

// 3. Reset Password (NO double hash here)
exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ message: "Email and new password are required." });
  }

  try {
    const updated = await PasswordReset.updatePassword(email, newPassword); // model will hash it

    if (!updated) {
      return res.status(400).json({ message: "User not found or password update failed." });
    }

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ message: "Password reset failed. Please try again." });
  }
};
