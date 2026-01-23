// emails/welcome.ts
/**
 * Email template for welcome email
 * Simple inline HTML, no external CSS
 */

export function renderWelcomeEmail(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to INDEX</title>
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
                Welcome to INDEX
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #121211;">
                INDEX is where thinking becomes usable.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #121211;">
                Start small: import one conversation that still matters.
              </p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #121211;">
                Then reduce it:
              </p>
              <ul style="margin: 16px 0 24px 0; padding-left: 20px; color: #121211;">
                <li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">Create a project</li>
                <li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">Make <strong>one</strong> task or decision</li>
                <li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">Use Ask Index to see what remains</li>
                <li style="margin: 8px 0; font-size: 16px; line-height: 1.6;">Generate a digest (optional)</li>
              </ul>
              <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 1.6; color: #121211;">
                That's it.
              </p>
              <p style="margin: 32px 0 0 0; font-size: 14px; color: #666666; font-style: italic;">
                — INDEX
              </p>
              <p style="margin: 32px 0 0 0; font-size: 12px; color: #999999;">
                If you didn't create this account, ignore this email.
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

