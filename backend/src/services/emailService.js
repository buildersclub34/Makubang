const nodemailer = require('nodemailer');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs').promises;
const { convert } = require('html-to-text');
const mjml2html = require('mjml');

// Create a test account for development
const createTestAccount = async () => {
  const testAccount = await nodemailer.createTestAccount();
  return {
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  };
};

// Production SMTP configuration
const getSmtpConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    };
  }
  return createTestAccount();
};

// Create reusable transporter object
let transporter;
const getTransporter = async () => {
  if (!transporter) {
    const smtpConfig = await getSmtpConfig();
    transporter = nodemailer.createTransport(smtpConfig);
    
    // Verify connection configuration
    try {
      await transporter.verify();
      console.log('SMTP server connection verified');
    } catch (error) {
      console.error('Error verifying SMTP connection:', error);
      throw new Error('Failed to connect to SMTP server');
    }
  }
  return transporter;
};

// Compile email template
const compileTemplate = async (templateName, data) => {
  try {
    const templatePath = path.join(
      __dirname,
      '..',
      'templates',
      'emails',
      `${templateName}.mjml`
    );
    
    const template = await fs.readFile(templatePath, 'utf8');
    const mjmlResult = mjml2html(template, { filePath: templatePath });
    
    if (mjmlResult.errors && mjmlResult.errors.length > 0) {
      console.error('MJML errors:', mjmlResult.errors);
      throw new Error('Failed to compile MJML template');
    }
    
    const html = ejs.render(mjmlResult.html, data);
    const text = convert(html, {
      wordwrap: 130,
      preserveNewlines: true,
      selectors: [
        { selector: 'a', options: { ignoreHref: true } },
        { selector: 'img', format: 'skip' },
      ],
    });
    
    return { html, text };
  } catch (error) {
    console.error('Error compiling email template:', error);
    throw new Error('Failed to compile email template');
  }
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {String|Array} options.to - Recipient email address(es)
 * @param {String} options.subject - Email subject
 * @param {String} [options.template] - Template name (without extension)
 * @param {Object} [options.context] - Template context data
 * @param {String} [options.html] - HTML content (alternative to template)
 * @param {String} [options.text] - Plain text content (auto-generated if not provided)
 * @param {Array} [options.attachments] - Email attachments
 * @returns {Promise<Object>} Result of the email send operation
 */
const sendEmail = async ({
  to,
  subject,
  template,
  context = {},
  html,
  text,
  attachments = [],
}) => {
  try {
    const transporter = await getTransporter();
    
    // Compile template if provided
    if (template) {
      const compiled = await compileTemplate(template, context);
      html = compiled.html;
      text = text || compiled.text;
    }
    
    // Default sender
    const from = `"${process.env.EMAIL_FROM_NAME || 'Makubang'}" <${
      process.env.EMAIL_FROM || 'noreply@makubang.com'
    }>`;
    
    const mailOptions = {
      from,
      to,
      subject,
      html,
      text,
      attachments,
      // Add DKIM signing if configured
      dkim: process.env.DKIM_PRIVATE_KEY
        ? {
            domainName: process.env.DKIM_DOMAIN,
            keySelector: process.env.DKIM_SELECTOR || 'default',
            privateKey: process.env.DKIM_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }
        : undefined,
    };
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    // Log the preview URL in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

// Common email templates
const sendWelcomeEmail = async (user) => {
  return sendEmail({
    to: user.email,
    subject: 'Welcome to Makubang!',
    template: 'welcome',
    context: {
      name: user.name,
      verifyUrl: `${process.env.CLIENT_URL}/verify-email?token=${user.emailVerificationToken}`,
    },
  });
};

const sendPasswordResetEmail = async (user, token) => {
  return sendEmail({
    to: user.email,
    subject: 'Reset Your Makubang Password',
    template: 'password-reset',
    context: {
      name: user.name,
      resetUrl: `${process.env.CLIENT_URL}/reset-password?token=${token}`,
      expiresIn: '1 hour',
    },
  });
};

const sendOrderConfirmationEmail = async (order, user) => {
  return sendEmail({
    to: user.email,
    subject: `Order Confirmation - #${order.orderNumber}`,
    template: 'order-confirmation',
    context: {
      name: user.name,
      order,
      orderUrl: `${process.env.CLIENT_URL}/orders/${order._id}`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@makubang.com',
    },
  });
};

const sendOrderStatusUpdateEmail = async (order, user, status) => {
  const statusTemplates = {
    processing: 'order-processing',
    confirmed: 'order-confirmed',
    preparing: 'order-preparing',
    ready_for_pickup: 'order-ready',
    out_for_delivery: 'order-out-for-delivery',
    delivered: 'order-delivered',
    cancelled: 'order-cancelled',
  };
  
  const template = statusTemplates[status] || 'order-update';
  
  return sendEmail({
    to: user.email,
    subject: `Order ${status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - #${order.orderNumber}`,
    template,
    context: {
      name: user.name,
      order,
      status,
      orderUrl: `${process.env.CLIENT_URL}/orders/${order._id}`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@makubang.com',
    },
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  // Export for testing
  _getTransporter: getTransporter,
};
