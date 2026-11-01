require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 15000,
});

console.log("Email user:", process.env.EMAIL_USER || "MISSING");
console.log("Email pass length:", (process.env.EMAIL_PASS || "").length);

transporter.verify((err) => {
  if (err) {
    console.log("VERIFY FAILED");
    console.log("Code:", err.code);
    console.log("Message:", err.message);
    return;
  }

  console.log("SMTP VERIFIED - credentials work");

  transporter
    .sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Test from Ethiopian IT Park",
      text: "If you receive this, email works!",
    })
    .then((info) => {
      console.log("Email sent:", info.response);
    })
    .catch((e) => {
      console.log("Send failed:", e.message, "| Code:", e.code);
    });
});