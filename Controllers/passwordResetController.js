const PasswordReset = require("../Models/passwordResetModel");
const dotenv = require("dotenv");
dotenv.config();

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.EMAIL_USER || "gebreslassiedessie@gmail.com";
const SENDER_NAME = "Ethiopian IT Park";

// Startup debug — confirms key is loaded
console.log("=== EMAIL CONFIGURATION ===");
console.log(
  "BREVO_API_KEY:",
  BREVO_API_KEY ? `set (${BREVO_API_KEY.length} chars)` : "MISSING"
);
console.log("SENDER_EMAIL:", SENDER_EMAIL);
console.log("===========================");

// ─── Send email via Brevo HTTPS API (Port 443 — NOT blocked) ───
async function sendEmailViaBrevo({ to, subject, htmlContent }) {
  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not set in environment");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo API ${response.status}: ${errorText}`);
  }

  return await response.json();
}

// ─── 1. Request Reset OTP ────────────────────────────────
exports.requestReset = async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ message: "Valid email is required." });
  }

  try {
    const otp = PasswordReset.generateResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const resetId = await PasswordReset.createOrUpdateResetToken(
      email,
      otp,
      expiresAt
    );

    if (resetId) {
      try {
        const result = await sendEmailViaBrevo({
          to: email,
          subject: "Your Password Reset OTP",
          htmlContent: `
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
        console.log(`✅ OTP email sent to ${email}. Message ID: ${result.messageId}`);
      } catch (emailError) {
        console.error("=== EMAIL SEND FAILED ===");
        console.error("  To:", email);
        console.error("  Error:", emailError.message);
        console.error("=========================");
        return res.status(500).json({
          message: "Could not send OTP email. Please try again later.",
        });
      }
    }

    res.status(200).json({
      message: "If the email exists, an OTP has been sent.",
    });
  } catch (error) {
    console.error("Error in requestReset:", error);
    res.status(500).json({ message: "Internal server error. Please try again." });
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
    return res.status(400).json({
      message: "Email and new password are required.",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters.",
    });
  }

  try {
    const updated = await PasswordReset.updatePassword(email, newPassword);
    if (!updated) {
      return res.status(400).json({
        message: "User not found or password update failed.",
      });
    }
    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ message: "Password reset failed. Please try again." });
  }
};