import "server-only";

import nodemailer from "nodemailer";
import { appName } from "@/lib/app-config";
import { validateInviteOnlyEmail } from "@/lib/invite-only";

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export const smtpEnabled = Boolean(process.env.SMTP_HOST?.trim());

/**
 * Escape HTML special characters to prevent injection in email templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize a URL for safe use in href attributes.
 * Only allows http/https protocols.
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return "#";
  } catch {
    return "#";
  }
}

/**
 * SMTP transporter via Nodemailer.
 *
 * Set SMTP_HOST to enable. If not configured, emails are logged to console.
 *
 * Env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, EMAIL_FROM
 */
const transporter = smtpEnabled
  ? nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  })
  : null;

const DEFAULT_FROM =
  process.env.EMAIL_FROM || `${appName} <noreply@localhost>`;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const masked = local.length <= 2 ? "*".repeat(local.length) : local[0] + "*".repeat(local.length - 2) + local[local.length - 1];
  return `${masked}@${domain}`;
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  if (!transporter) {
    console.warn(
      `SMTP is not configured; skipped outbound email "${opts.subject}" to ${maskEmail(opts.to)}.`,
    );
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: opts.from ?? DEFAULT_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
  } catch (error) {
    console.error(`❌ Failed to send email to ${maskEmail(opts.to)}:`, error);
    throw error;
  }
}

export async function sendVerificationEmail({ user, url }: { user: { email: string }, url: string }) {
  const validation = await validateInviteOnlyEmail(user.email);
  if (!validation.allowed) {
    throw new Error(validation.message);
  }

  const safeUrl = sanitizeUrl(url);

  await sendEmail({
    to: user.email,
    subject: "Verify your email address",
    html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Verify your email</h2>
          <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            Please verify your email address by clicking the link below.
          </p>
          <a href="${safeUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 500;">
            Verify Email
          </a>
        </div>
      `,
  });
}

export async function sendPasswordResetEmail({ user, url }: { user: { email: string }, url: string }) {
  const safeUrl = sanitizeUrl(url);

  await sendEmail({
    to: user.email,
    subject: "Reset your password",
    html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Reset your password</h2>
          <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            Click the link below to reset your password. If you didn't request this, you can safely ignore this email.
          </p>
          <a href="${safeUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 500;">
            Reset Password
          </a>
        </div>
      `,
  });
}

export async function send2FAEmail({ user, otp }: { user: { email: string }, otp: string }) {
  const safeOtp = escapeHtml(otp);

  await sendEmail({
    to: user.email,
    subject: "Your verification code",
    html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Your 2FA Code</h2>
          <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            Enter the code below to sign in:
          </p>
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 12px; background: #f4f4f5; border-radius: 6px; text-align: center;">
            ${safeOtp}
          </div>
        </div>
      `,
  });
}
