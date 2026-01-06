import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendPurchaseConfirmationParams {
  to: string;
  userName: string;
  accountNumber: string;
  tierName: string;
  accountSize: number;
  price: string;
}

export async function sendPurchaseConfirmation({
  to,
  userName,
  accountNumber,
  tierName,
  accountSize,
  price,
}: SendPurchaseConfirmationParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "noreply@yourpropfirm.com",
      to: [to],
      subject: `Account Created - ${tierName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Account Created</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to PropFirm</h1>
            </div>

            <div style="background: #f7fafc; padding: 40px 20px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #2d3748; margin-top: 0;">Hi ${userName},</h2>

              <p style="color: #4a5568; font-size: 16px;">
                Congratulations! Your trading account has been successfully created.
              </p>

              <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #2d3748;">Account Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #718096; font-weight: 500;">Account Number:</td>
                    <td style="padding: 8px 0; color: #2d3748; font-weight: 600; text-align: right;">${accountNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096; font-weight: 500;">Tier:</td>
                    <td style="padding: 8px 0; color: #2d3748; font-weight: 600; text-align: right;">${tierName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096; font-weight: 500;">Account Size:</td>
                    <td style="padding: 8px 0; color: #2d3748; font-weight: 600; text-align: right;">$${accountSize.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096; font-weight: 500;">Amount Paid:</td>
                    <td style="padding: 8px 0; color: #10b981; font-weight: 600; text-align: right;">$${price}</td>
                  </tr>
                </table>
              </div>

              <div style="background: #edf2f7; padding: 20px; border-radius: 4px; margin: 30px 0;">
                <h3 style="margin-top: 0; color: #2d3748;">Next Steps</h3>
                <ol style="color: #4a5568; margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 10px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="color: #667eea; text-decoration: none; font-weight: 500;">Log in to your dashboard</a> to view your account
                  </li>
                  <li style="margin-bottom: 10px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/rules" style="color: #667eea; text-decoration: none; font-weight: 500;">Review the evaluation rules</a> and requirements
                  </li>
                  <li style="margin-bottom: 10px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/faq" style="color: #667eea; text-decoration: none; font-weight: 500;">Connect your trading platform</a> (see FAQ for instructions)
                  </li>
                  <li>Start trading and hit your profit target!</li>
                </ol>
              </div>

              <div style="text-align: center; margin: 40px 0 20px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/accounts"
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                          color: white;
                          padding: 14px 32px;
                          text-decoration: none;
                          border-radius: 6px;
                          font-weight: 600;
                          display: inline-block;">
                  View My Account
                </a>
              </div>

              <p style="color: #718096; font-size: 14px; text-align: center; margin-top: 40px;">
                If you have any questions, please don't hesitate to contact our support team.
              </p>
            </div>

            <div style="text-align: center; padding: 20px; color: #a0aec0; font-size: 12px;">
              <p>© ${new Date().getFullYear()} PropFirm. All rights reserved.</p>
              <p style="margin-top: 10px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #667eea; text-decoration: none;">Dashboard</a> |
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color: #667eea; text-decoration: none;">Settings</a>
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Error sending purchase confirmation email:", error);
      return { success: false, error };
    }

    console.log("Purchase confirmation email sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send purchase confirmation email:", error);
    return { success: false, error };
  }
}
