const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOTPEmail = async (toEmail, otpCode, userName) => {
  const mailOptions = {
    from: `"Aplikasi Manajemen" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Kode OTP Reset Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #333;">Halo, ${userName}</h2>
        <p>Anda telah meminta reset password. Berikut adalah kode OTP Anda:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #2563eb; letter-spacing: 8px; margin: 0;">${otpCode}</h1>
        </div>
        <p>Kode ini berlaku selama <strong>10 menit</strong>.</p>
        <p style="color: #666; font-size: 12px;">Jika Anda tidak meminta reset password, abaikan email ini.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };