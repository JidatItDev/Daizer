import nodemailer from "nodemailer";
import { config } from "../config/EmailVar";

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: +(config.smtp.port ?? 587),
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  // ✅ General send method with HTML support
  private static async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ) {
    await this.transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Fallback text version
    });
  }

  private static getBaseTemplate(title: string, content: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                overflow: hidden;
                position: relative;
            }
            .header {
                background: linear-gradient(135deg, #2C2E5F 0%, #7c3aed 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: shimmer 3s ease-in-out infinite;
            }
            @keyframes shimmer {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(180deg); }
            }
            .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 10px;
                position: relative;
                z-index: 1;
            }
            .header .subtitle {
                font-size: 16px;
                opacity: 0.9;
                position: relative;
                z-index: 1;
            }
            .content {
                padding: 40px 30px;
                position: relative;
            }
            .content::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #4f46e5, #7c3aed, #ec4899, #f59e0b);
            }
            .greeting {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 20px;
            }
            .message {
                font-size: 16px;
                line-height: 1.8;
                color: #4b5563;
                margin-bottom: 30px;
            }
            .credentials-box {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border: 2px solid #e5e7eb;
                border-radius: 16px;
                padding: 25px;
                margin: 25px 0;
                position: relative;
                overflow: hidden;
            }
            .credentials-box::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6);
            }
            .credentials-box h3 {
                color: #1f2937;
                font-size: 18px;
                margin-bottom: 15px;
                font-weight: 600;
            }
            .credential-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 12px 0;
                padding: 12px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .credential-label {
                font-weight: 600;
                color: #374151;
                font-size: 14px;
            }
            .credential-value {
                font-family: 'Courier New', monospace;
                background: #f3f4f6;
                padding: 8px 12px;
                border-radius: 6px;
                color: #1f2937;
                font-weight: 600;
                border: 1px solid #d1d5db;
            }
            .warning-box {
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 2px solid #f59e0b;
                border-radius: 12px;
                padding: 20px;
                margin: 25px 0;
                position: relative;
            }
            .warning-box::before {
                content: '⚠️';
                position: absolute;
                top: -10px;
                left: 20px;
                background: #f59e0b;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
            }
            .warning-box p {
                color: #92400e;
                font-weight: 500;
                margin-top: 5px;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #2C2E5F 0%, #7c3aed 100%);
                color: #ffffff;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
                transition: all 0.3s ease;
                margin: 20px 0;
            }
            .cta-button:hover {
                box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
                transform: translateY(-2px);
            }
            .footer {
                background: #f8fafc;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
            }
            .footer p {
                color: #6b7280;
                font-size: 14px;
                margin-bottom: 10px;
            }
            .footer .company-name {
                font-weight: 600;
                color: #4f46e5;
            }
            .divider {
                height: 1px;
                background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
                margin: 30px 0;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 15px;
                }
                .header, .content {
                    padding: 30px 20px;
                }
                .credential-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }
                .credential-value {
                    align-self: stretch;
                    text-align: center;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            ${content}
        </div>
    </body>
    </html>
    `;
  }

  static async sendPasswordResetLinkEmail(email: string, resetLink: string) {
    const subject = "Daizer: Reset Your Password";

    const content = `
      <div class="header">
        <h1>Reset Your Password</h1>
        <p class="subtitle">Click the button below to reset your password</p>
      </div>
      <div class="content">
        <p class="message">We received a request to reset your password. If this was not you, please ignore this email.</p>
        <div style="text-align:center;">
          <a href="${resetLink}"  style="
          display:inline-block;
          background-color:#2C2E5F;
          color: #ffffff !important;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
          margin: 20px 0;
        " >Reset Password</a>
        </div>
      </div>
    `;

    const html = this.getBaseTemplate(subject, content);
    await this.sendEmail(email, subject, html);
  }

  static async sendSignupLinkEmail(email: string, signupLink: string) {
    const subject = "Daizer: Complete Your Signup";
    const content = `
      <div class="header">
        <h1>Welcome to Daizer!</h1>
        <p class="subtitle">You're just one step away from getting started 🚀</p>
      </div>
      <div class="content">
        <p class="message">Click the button below to complete your signup process and set up your account.</p>
        <div style="text-align:center;">
          <a href="${signupLink}" class="cta-button">Complete Signup</a>
        </div>
        <div class="warning-box">
          <p>This link will expire in 24 hours for your security. Please complete the signup process before it expires.</p>
        </div>
      </div>
    `;

    const html = this.getBaseTemplate(subject, content);
    await this.sendEmail(email, subject, html);
  }
}
