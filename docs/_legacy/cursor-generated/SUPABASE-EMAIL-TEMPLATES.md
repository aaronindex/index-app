# Supabase Email Templates for INDEX

This document contains HTML email templates for Supabase authentication emails. Copy and paste these into your Supabase dashboard under Authentication > Email Templates.

## Design Notes
- Minimalist, clean design matching INDEX aesthetic
- Ink/paper theme (dark text on light background)
- Simple typography, no complex layouts
- Responsive and email-client compatible
- Uses inline CSS for maximum compatibility

---

## 1. Magic Link Email Template

**Location in Supabase:** Authentication > Email Templates > Magic Link

**Subject:** Sign in to INDEX

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to INDEX</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FAF7F2; color: #0b0a08;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #FAF7F2;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e5e5;">
          <tr>
            <td style="padding: 48px 40px;">
              <!-- Logo/Header -->
              <h1 style="margin: 0 0 32px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 600; color: #0b0a08; letter-spacing: -0.5px;">
                INDEX
              </h1>
              
              <!-- Main Content -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #0b0a08;">
                Click the button below to sign in to your INDEX account.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; background-color: #0b0a08; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500; letter-spacing: 0.2px;">
                      Sign in to INDEX
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.5; color: #686765;">
                Or copy and paste this link into your browser:<br>
                <a href="{{ .ConfirmationURL }}" style="color: #0b0a08; text-decoration: underline; word-break: break-all;">{{ .ConfirmationURL }}</a>
              </p>
              
              <!-- Footer -->
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 40px 0 24px 0;">
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #686765;">
                This link will expire in 1 hour. If you didn't request this email, you can safely ignore it.
              </p>
              <p style="margin: 16px 0 0 0; font-size: 13px; line-height: 1.5; color: #686765;">
                © {{ .Year }} INDEX. Personal Business Intelligence for your AI life.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Reset Password Email Template

**Location in Supabase:** Authentication > Email Templates > Reset Password

**Subject:** Reset your INDEX password

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your INDEX password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FAF7F2; color: #0b0a08;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #FAF7F2;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e5e5;">
          <tr>
            <td style="padding: 48px 40px;">
              <!-- Logo/Header -->
              <h1 style="margin: 0 0 32px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 600; color: #0b0a08; letter-spacing: -0.5px;">
                INDEX
              </h1>
              
              <!-- Main Content -->
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #0b0a08;">
                You requested to reset your password for your INDEX account. Click the button below to set a new password.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; background-color: #0b0a08; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500; letter-spacing: 0.2px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Alternative Link -->
              <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.5; color: #686765;">
                Or copy and paste this link into your browser:<br>
                <a href="{{ .ConfirmationURL }}" style="color: #0b0a08; text-decoration: underline; word-break: break-all;">{{ .ConfirmationURL }}</a>
              </p>
              
              <!-- Security Note -->
              <div style="margin: 32px 0 0 0; padding: 16px; background-color: #f4f2f0; border-radius: 6px; border-left: 3px solid #0b0a08;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #0b0a08;">
                  <strong>Security note:</strong> If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                </p>
              </div>
              
              <!-- Footer -->
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 40px 0 24px 0;">
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #686765;">
                This link will expire in 1 hour.
              </p>
              <p style="margin: 16px 0 0 0; font-size: 13px; line-height: 1.5; color: #686765;">
                © {{ .Year }} INDEX. Personal Business Intelligence for your AI life.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Supabase Template Variables Reference

These variables are automatically replaced by Supabase:

- `{{ .ConfirmationURL }}` - The confirmation/reset link URL
- `{{ .Email }}` - The user's email address
- `{{ .SiteURL }}` - Your site URL (from Supabase settings)
- `{{ .Year }}` - Current year

## How to Use

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Email Templates**
3. Select the template type (Magic Link or Reset Password)
4. Copy the HTML from above and paste into the template editor
5. Update the subject line as indicated
6. Save the template

## Design System Colors Used

- Background: `#FAF7F2` (cream off-white)
- Card background: `#ffffff` (white)
- Text primary: `#0b0a08` (dark ink)
- Text muted: `#686765` (gray)
- Border: `#e5e5e5` (light gray)
- Accent background: `#f4f2f0` (light beige)
- Button: `#0b0a08` (dark) with white text

## Notes

- All CSS is inline for maximum email client compatibility
- Uses table-based layout for better email client support
- Responsive design that works on mobile and desktop
- Playfair Display font for headings (falls back to system serif fonts)
- Simple, clean design matching INDEX's minimalist aesthetic

