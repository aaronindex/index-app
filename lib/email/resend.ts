// lib/email/resend.ts
/**
 * Centralized Resend email sending helper
 * Provides consistent defaults for all emails: from domain, reply-to, and list-unsubscribe headers
 */

import { Resend } from 'resend';

// Lazy initialization - only create Resend instance when needed
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

/**
 * Default email configuration
 */
const DEFAULT_FROM = 'INDEX <hello@mail.indexapp.co>';
const DEFAULT_REPLY_TO = 'Aaron <hello@indexapp.co>';
const DEFAULT_HEADERS = {
  'List-Unsubscribe': '<mailto:unsubscribe@indexapp.co>',
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
};

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

/**
 * Send an email via Resend with consistent defaults
 * 
 * All emails automatically get:
 * - from: INDEX <hello@mail.indexapp.co> (unless overridden)
 * - replyTo: Aaron <hello@indexapp.co> (unless overridden)
 * - List-Unsubscribe headers (unless overridden)
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const resend = getResendClient();

    const result = await resend.emails.send({
      from: options.from || DEFAULT_FROM,
      to: options.to,
      replyTo: options.replyTo || DEFAULT_REPLY_TO,
      subject: options.subject,
      html: options.html,
      text: options.text,
      headers: {
        ...DEFAULT_HEADERS,
        ...options.headers,
      },
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error('Send email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

