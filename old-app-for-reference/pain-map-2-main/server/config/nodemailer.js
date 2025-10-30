const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');

let transporter;

// Debug logging to see what env vars are available
console.log('📧 Email Configuration Check:');
console.log('  MAILGUN_API_KEY:', process.env.MAILGUN_API_KEY ? '✓ Set' : '✗ Missing');
console.log('  MAILGUN_DOMAIN:', process.env.MAILGUN_DOMAIN ? `✓ ${process.env.MAILGUN_DOMAIN}` : '✗ Missing');
console.log('  MAILGUN_SMTP_LOGIN:', process.env.MAILGUN_SMTP_LOGIN ? '✓ Set' : '✗ Missing');

// Prefer Mailgun API over SMTP (more reliable in containerized environments)
if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
  const mailgunAuth = {
    auth: {
      api_key: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN
    }
  };
  
  transporter = nodemailer.createTransport(mg(mailgunAuth));
  console.log('✅ Mailgun API transporter initialized');
  
} else if (process.env.MAILGUN_SMTP_LOGIN && process.env.MAILGUN_SMTP_PASSWORD) {
  // Fallback to SMTP if API key not available
  console.log('⚠️ Using SMTP fallback (API key not configured)');
  transporter = nodemailer.createTransport({
    host: process.env.MAILGUN_SMTP_SERVER,
    port: parseInt(process.env.MAILGUN_SMTP_PORT || "587", 10),
    secure: parseInt(process.env.MAILGUN_SMTP_PORT || "587", 10) === 465,
    auth: {
      user: process.env.MAILGUN_SMTP_LOGIN,
      pass: process.env.MAILGUN_SMTP_PASSWORD,
    },
  });

  // NEVER verify SMTP in production - causes startup delays and false errors
  console.log('⚠️ SMTP verification skipped (use API for better reliability)');
} else {
  console.warn('⚠️ No Mailgun credentials found. Email sending disabled.');
}

module.exports = transporter;
