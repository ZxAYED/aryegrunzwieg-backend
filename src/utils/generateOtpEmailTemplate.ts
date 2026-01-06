type OtpTemplateParams = {
  appName: string;
  title: string;
  message: string;
  otp: string;
  primaryColor?: string;
};

export function generateOtpEmailTemplate({
  appName,
  title,
  message,
  otp,
  primaryColor = '#C0CFD0',
}: OtpTemplateParams) {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background:#f6f8fa;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;box-shadow:0 12px 28px rgba(15,23,42,0.08);overflow:hidden;">
              <tr>
                <td style="background:${primaryColor};padding:20px 28px;">
                  <div style="font-size:14px;letter-spacing:1px;color:#0f172a;text-transform:uppercase;">${appName}</div>
                  <div style="font-size:22px;font-weight:700;margin-top:6px;color:#0f172a;">${title}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;">
                  <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${message}</p>
                  <div style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 20px;border-radius:10px;font-size:26px;font-weight:700;letter-spacing:6px;">
                    ${otp}
                  </div>
                  <p style="margin:18px 0 0;font-size:13px;color:#475569;">This OTP is valid for 10 minutes.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 28px 26px;color:#64748b;font-size:12px;">
                  If you did not request this, you can safely ignore this email.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}
