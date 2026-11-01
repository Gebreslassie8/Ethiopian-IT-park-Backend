const PasswordReset = require("../Models/passwordResetModel");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

// ─── Email Transporter Setup ─────────────────────────────
// Uses port 465 (SSL) — works on Render where port 587 is blocked
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Fail fast instead of hanging (avoids 502 Bad Gateway on Render)
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

// ─── Startup verification (helps debug env vars) ─────────
(() => {
  console.log("=== EMAIL CONFIGURATION ===");
  console.log("EMAIL_USER:", process.env.EMAIL_USER || "❌ MISSING");
  console.log(
    "EMAIL_PASS length:",
    process.env.EMAIL_PASS?.length || 0,
    process.env.EMAIL_PASS?.length === 16 ? "✅ (16 chars)" : "⚠️ expected 16"
  );
  console.log(
    "EMAIL_PASS has spaces:",
    process.env.EMAIL_PASS?.includes(" ") ? "❌ YES (remove them!)" : "✅ NO"
  );
  console.log("===========================");

  // Test SMTP connection on boot (optional — logs only, doesn't block)
  transporter.verify((err) => {
    if (err) {
      console.error("❌ SMTP connection test FAILED:");
      console.error("   Code:", err.code);
      console.error("   Message:", err.message);
    } else {
      console.log("✅ SMTP ready — Gmail connection verified");
    }
  });
})();

// ─── 1. Request Reset OTP ────────────────────────────────
exports.requestReset = async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ message: "Valid email is required." });
  }

  try {
    const otp = PasswordReset.generateResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const resetId = await PasswordReset.createOrUpdateResetToken(
      email,
      otp,
      expiresAt
    );

    // Only send email if token was created/updated successfully
    if (resetId) {
      try {
        await transporter.sendMail({
          from: `Ethiopian IT Park <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Your Password Reset OTP",
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #007BFF;">Password Reset Request</h2>
              <p>Dear user,</p>
              <p>Your One-Time Password (OTP) for resetting your password is:</p>
              <h3 style="color: #007BFF; font-size: 32px; letter-spacing: 4px; background: #f0f8ff; padding: 12px; text-align: center; border-radius: 8px;">${otp}</h3>
              <p>This OTP will expire in <strong>15 minutes</strong>.</p>
              <p>If you did not request this, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="font-size: 12px; color: #999;">Ethiopian IT Park — Digital Enterprise Content Management System</p>
            </div>
          `,
        });
        console.log(`✅ OTP email sent to ${email}`);
      } catch (emailError) {
        // Email failed but token exists — log and continue
        // (User can't reset without OTP, but they'll know to try again)
        console.error("=== EMAIL SEND FAILED ===");
        console.error("  To:", email);
        console.error("  Code:", emailError.code);
        console.error("  Message:", emailError.message);
        console.error("  Full:", emailError);
        console.error("=========================");

        return res.status(500).json({
          message:
            "Could not send OTP email. Check your email address or try again later.",
        });
      }
    }

    res.status(200).json({
      message: "If the email exists, an OTP has been sent.",
    });
  } catch (error) {
    console.error("Error in requestReset:", error);
    res
      .status(500)
      .json({ message: "Internal server error. Please try again." });
  }
};

// ─── 2. Verify OTP ───────────────────────────────────────
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

// ─── 3. Reset Password (model hashes it) ─────────────────
exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email and new password are required." });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters." });
  }

  try {
    const updated = await PasswordReset.updatePassword(email, newPassword);

    if (!updated) {
      return res
        .status(400)
        .json({ message: "User not found or password update failed." });
    }

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res
      .status(500)
      .json({ message: "Password reset failed. Please try again." });
  }
};