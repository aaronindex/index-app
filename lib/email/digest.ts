// lib/email/digest.ts
/**
 * Email sending for weekly digests using Resend
 */

import { sendEmail } from './resend';
import { getLoopDisplayTitle, normalizeLoopSnippet, normalizeStepReason } from '../digest/helpers';

interface DigestEmailData {
  summary: string;
  topThemes: Array<{ theme: string; weight: number }>;
  openLoops: Array<{ conversation_id: string; conversation_title: string | null; snippet: string; priority?: 'high' | 'medium' | 'low' }>;
  recommendedNextSteps: Array<{ action: string; reason: string | null; priority?: 'high' | 'medium' | 'low' }>;
  weekStart: string;
  weekEnd: string;
  userName?: string;
  digestUrl?: string;
}

/**
 * Generate HTML email template for weekly digest
 */
function generateDigestEmailHTML(data: DigestEmailData): string {
  // Top 3 open loops only
  const topLoops = data.openLoops.slice(0, 3);
  const openLoopsHTML = topLoops.length > 0
    ? `
      <div style="margin: 24px 0;">
        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #18181b;">Open Loops</h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${topLoops.map((loop) => {
            const displayTitle = getLoopDisplayTitle(loop);
            const normalizedSnippet = normalizeLoopSnippet(loop.snippet || '');
            const priorityBadge = loop.priority && (loop.priority === 'high' || loop.priority === 'medium')
              ? `<span style="display: inline-block; padding: 2px 8px; background: ${loop.priority === 'high' ? '#fee2e2' : '#fef3c7'}; color: ${loop.priority === 'high' ? '#991b1b' : '#92400e'}; border-radius: 4px; font-size: 11px; font-weight: 500; margin-left: 8px;">${loop.priority}</span>`
              : '';
            return `
            <li style="margin: 12px 0; padding: 12px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px;">
              <strong style="color: #18181b; display: block; margin-bottom: 4px;">
                ${displayTitle}${priorityBadge}
              </strong>
              ${normalizedSnippet ? `<p style="color: #52525b; font-size: 14px; margin: 0;">${normalizedSnippet}</p>` : ''}
            </li>
          `;
          }).join('')}
        </ul>
      </div>
    `
    : '';

  // Top 2-3 recommended next steps
  const topSteps = data.recommendedNextSteps.slice(0, 3);
  const nextStepsHTML = topSteps.length > 0
    ? `
      <div style="margin: 24px 0;">
        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #18181b;">Recommended Next Steps</h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${topSteps.map((step) => {
            const normalizedReason = normalizeStepReason(step.reason);
            const priorityBadge = step.priority && (step.priority === 'high' || step.priority === 'medium')
              ? `<span style="display: inline-block; padding: 2px 8px; background: ${step.priority === 'high' ? '#fee2e2' : '#dbeafe'}; color: ${step.priority === 'high' ? '#991b1b' : '#1e40af'}; border-radius: 4px; font-size: 11px; font-weight: 500; margin-left: 8px;">${step.priority}</span>`
              : '';
            return `
            <li style="margin: 12px 0; padding: 12px; background: #dbeafe; border-left: 3px solid #3b82f6; border-radius: 4px;">
              <strong style="color: #18181b; display: block; margin-bottom: 4px;">
                ${step.action}${priorityBadge}
              </strong>
              ${normalizedReason ? `<p style="color: #52525b; font-size: 14px; margin: 0;">${normalizedReason}</p>` : ''}
            </li>
          `;
          }).join('')}
        </ul>
      </div>
    `
    : '';

  const viewDigestLink = data.digestUrl
    ? `
      <div style="margin: 24px 0; text-align: center;">
        <a href="${data.digestUrl}" style="display: inline-block; padding: 12px 24px; background: #18181b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">
          View Full Digest
        </a>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #18181b; background: #ffffff; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: 600; margin: 0; color: #18181b;">Your Weekly INDEX Digest</h1>
            <p style="color: #71717a; font-size: 14px; margin: 8px 0 0 0;">
              ${new Date(data.weekStart).toLocaleDateString()} - ${new Date(data.weekEnd).toLocaleDateString()}
            </p>
          </div>

          <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #18181b;">Summary</h2>
            <div style="color: #52525b; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${data.summary}</div>
          </div>

          ${openLoopsHTML}
          ${nextStepsHTML}
          ${viewDigestLink}

          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7; text-align: center;">
            <p style="color: #71717a; font-size: 12px; margin: 0;">
              This digest was generated by INDEX. Your conversations are private and never used to train AI models.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Send weekly digest email
 */
export async function sendDigestEmail(
  to: string,
  data: DigestEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const result = await sendEmail({
      to,
      subject: `Your Weekly INDEX Digest: ${new Date(data.weekStart).toLocaleDateString()} - ${new Date(data.weekEnd).toLocaleDateString()}`,
      html: generateDigestEmailHTML(data),
    });

    return result;
  } catch (error) {
    console.error('Send digest email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

