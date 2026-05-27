const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

const sendEmail = async (to, subject, body) => {
  const mailOptions = {
    from: process.env.NODEMAILER_EMAIL,
    to,
    subject,
    text: body,
  };

  console.log(`[EMAIL] Sending to: ${to} | Subject: ${subject}`);

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Sent successfully. MessageId: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`[EMAIL] Failed to send to ${to}:`, error.message);
    throw error;
  }
};

module.exports = { sendEmail };
