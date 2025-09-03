interface EmailTemplateOptions {
  appName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

export const getEmailVerificationTemplate = (options: {
  name: string;
  verificationUrl: string;
  expiresInHours: number;
} & EmailTemplateOptions) => {
  const { name, verificationUrl, expiresInHours, appName, logoUrl, primaryColor, secondaryColor } = options;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - ${appName}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eee;
        }
        .logo {
          max-width: 150px;
          height: auto;
        }
        .content {
          padding: 30px 20px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: ${primaryColor || '#4f46e5'};
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 600;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #eee;
        }
        .code {
          font-family: monospace;
          background-color: #f0f0f0;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.9em;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="${appName} Logo" class="logo">` : `<h1>${appName}</h1>`}
        </div>
        
        <div class="content">
          <h2>Verify Your Email Address</h2>
          <p>Hello ${name || 'there'},</p>
          
          <p>Thank you for signing up with ${appName}! To complete your registration and start using our platform, please verify your email address by clicking the button below:</p>
          
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </p>
          
          <p>Or copy and paste this link into your browser:</p>
          <p class="code">${verificationUrl}</p>
          
          <p>This verification link will expire in ${expiresInHours} hours. If you did not create an account with ${appName}, you can safely ignore this email.</p>
          
          <p>Best regards,<br>The ${appName} Team</p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          <p>If you're having trouble with the button above, copy and paste the URL below into your web browser.</p>
          <p><small>${verificationUrl}</small></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getPasswordResetTemplate = (options: {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
} & EmailTemplateOptions) => {
  const { name, resetUrl, expiresInMinutes, appName, logoUrl, primaryColor } = options;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - ${appName}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eee;
        }
        .logo {
          max-width: 150px;
          height: auto;
        }
        .content {
          padding: 30px 20px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: ${primaryColor || '#4f46e5'};
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 600;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #eee;
        }
        .code {
          font-family: monospace;
          background-color: #f0f0f0;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.9em;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="${appName} Logo" class="logo">` : `<h1>${appName}</h1>`}
        </div>
        
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>Hello ${name || 'there'},</p>
          
          <p>We received a request to reset the password for your ${appName} account. If you made this request, please click the button below to set a new password:</p>
          
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          
          <p>Or copy and paste this link into your browser:</p>
          <p class="code">${resetUrl}</p>
          
          <p>This password reset link will expire in ${expiresInMinutes} minutes. If you did not request a password reset, please ignore this email or contact support if you have any concerns.</p>
          
          <p>Best regards,<br>The ${appName} Team</p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          <p>If you're having trouble with the button above, copy and paste the URL below into your web browser.</p>
          <p><small>${resetUrl}</small></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Export default templates for backward compatibility
export default {
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
};
