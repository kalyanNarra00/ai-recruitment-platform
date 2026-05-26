const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
  debug: true,
});

const sendEmail = async (to, subject, body) => {
  try {
    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to,
      subject,
      text: body,
    };

    // In test mode, log to console instead of actually sending
    console.log('\n[EMAIL LOG]');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:', body);
    console.log('[END EMAIL LOG]\n');

    // Uncomment below when ready to send real emails
    // return await transporter.sendMail(mailOptions);

    return { messageId: 'test-mode' };
  } catch (error) {
    console.error('Email error:', error.message);
    throw error;
  }
};

module.exports = { sendEmail };
