// emails/waitlist-confirmation.ts
/**
 * Email template for waitlist confirmation
 * Simple inline HTML, no external CSS
 */

export function renderWaitlistConfirmationEmail(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the INDEX early list</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #faf8f6; color: #121211;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf8f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; padding: 40px;">
          <tr>
            <td>
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #121211;">
                INDEX
              </h1>
              <h2 style="margin: 24px 0 16px 0; font-size: 20px; font-weight: 600; color: #121211;">
                You're on the early list.
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #121211;">
                INDEX is a personal business intelligence layer for AI work.
              </p>
              <div style="margin: 24px 0; padding: 16px 0; border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5;">
                <p style="margin: 8px 0; font-size: 16px; line-height: 1.6; color: #121211;">
                  Chaos goes in. Clarity comes out. Thinking happens elsewhere.
                </p>
              </div>
              <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 1.6; color: #121211;">
                We'll reach out when there's something worth your attention.
              </p>
              <p style="margin: 32px 0 0 0; font-size: 14px; color: #666666; font-style: italic;">
                — INDEX
              </p>
              <p style="margin: 32px 0 0 0; font-size: 12px; color: #999999;">
                If you didn't request this, you can ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

