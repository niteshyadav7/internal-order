import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { order, origin } = await request.json();
    if (!order) {
      return NextResponse.json({ success: false, error: 'Missing order details' }, { status: 400 });
    }

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';

    // Calculate total value
    const totalValue = order.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

    if (!smtpUser || !smtpPass) {
      console.warn('⚠️ SMTP credentials missing (SMTP_USER/SMTP_PASS in .env.local). Email notification skipped.');
      return NextResponse.json({ 
        success: true, 
        message: 'Order created, but email notification skipped due to missing SMTP configuration in .env.local.' 
      });
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE !== 'false'; // default is true for port 465

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const itemsHtml = order.items.map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-family: sans-serif; font-size: 14px; color: #1e293b;">
          <strong>${item.nameEn}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-family: sans-serif; font-size: 14px; color: #475569; text-align: center;">
          ${item.quantity} ${item.unit || 'unit'}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-family: sans-serif; font-size: 14px; color: #475569; text-align: right;">
          ₹${item.price.toLocaleString()}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-family: sans-serif; font-size: 14px; color: #1e293b; font-weight: bold; text-align: right;">
          ₹${(item.price * item.quantity).toLocaleString()}
        </td>
      </tr>
    `).join('');

    const dashboardUrl = `${origin || 'http://localhost:3000'}/admin`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Order Request Received</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;" border="0" cellspacing="0" cellpadding="0">
                <!-- Header Band -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0b0e14 0%, #1a2333 100%); padding: 32px 40px; text-align: left;">
                    <span style="background-color: rgba(255, 255, 255, 0.1); color: #818cf8; font-size: 10px; font-weight: 900; letter-spacing: 0.1em; padding: 6px 12px; border-radius: 9999px; text-transform: uppercase;">
                      Logistics Notification
                    </span>
                    <h1 style="color: #ffffff; margin: 12px 0 0 0; font-size: 20px; font-weight: 800; line-height: 1.2;">
                      New Order Request Alert
                    </h1>
                    <p style="color: #94a3b8; font-size: 12px; margin: 6px 0 0 0; font-weight: 500;">
                      Order ID: #${order.id}
                    </p>
                  </td>
                </tr>
                
                <!-- Main Body Content -->
                <tr>
                  <td style="padding: 40px;">
                    <!-- Customer Details Card -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 16px; padding: 20px; margin-bottom: 28px;">
                      <tr>
                        <td>
                          <h3 style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">
                            Buyer Credentials
                          </h3>
                          <p style="color: #0f172a; font-size: 14px; font-weight: 700; margin: 0;">
                            ${order.userName}
                          </p>
                          <p style="color: #475569; font-size: 13px; font-weight: 500; margin: 4px 0 0 0;">
                            ${order.userEmail}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Ordered Items List -->
                    <h3 style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0;">
                      Ordered Product Logistics (${order.items.length})
                    </h3>
                    
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px; border-collapse: collapse;">
                      <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                          <th align="left" style="padding: 10px 12px; font-family: sans-serif; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">Product Details</th>
                          <th align="center" style="padding: 10px 12px; font-family: sans-serif; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 80px; text-align: center;">Qty</th>
                          <th align="right" style="padding: 10px 12px; font-family: sans-serif; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 100px; text-align: right;">Unit Price</th>
                          <th align="right" style="padding: 10px 12px; font-family: sans-serif; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; width: 100px; text-align: right;">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colspan="3" align="right" style="padding: 20px 12px 0 0; font-family: sans-serif; font-size: 13px; font-weight: bold; color: #64748b; text-align: right;">
                            Grand Total Logistics:
                          </td>
                          <td align="right" style="padding: 20px 12px 0 0; font-family: sans-serif; font-size: 16px; font-weight: 900; color: #4f46e5; text-align: right;">
                            ₹${totalValue.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    <!-- Call To Action Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding-top: 10px;">
                          <a href="${dashboardUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-family: sans-serif; font-size: 13px; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.15); text-transform: uppercase; letter-spacing: 0.05em;">
                            View Order in Admin Panel
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer Info -->
                <tr>
                  <td style="padding: 0 40px 40px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; font-size: 11px; font-weight: 500; margin: 20px 0 0 0; line-height: 1.5;">
                      This is an automated system alert sent by Elegance Logistics portal.<br>
                      To change email notification preferences, update your configuration files.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Elegance Logistics Alerts" <${smtpUser}>`,
      to: adminEmail,
      subject: `🚨 New Order Request: ₹${totalValue.toLocaleString()} from ${order.userName}`,
      html: htmlContent
    });

    return NextResponse.json({ success: true, message: 'Email sent successfully!' });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email notification: ' + error.message },
      { status: 500 }
    );
  }
}
