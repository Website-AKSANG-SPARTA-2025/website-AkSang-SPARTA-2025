import { ApplicationError } from "../errors/application-error";
import { sendEmail } from "../lib/email";

export type VerificationEmailInput = {
  to: string;
  participantName: string;
  verificationUrl: string;
  purpose: "ATTENDANCE" | "WORKSHOP";
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

export async function sendVerificationEmail(input: VerificationEmailInput): Promise<void> {
  const to = input.to.trim();
  const participantName = input.participantName.trim();
  const verificationUrl = input.verificationUrl.trim();
  if (!to || !participantName || !verificationUrl) {
    throw new ApplicationError("VALIDATION_ERROR", 400, "Invalid verification email input");
  }

  const workshop = input.purpose === "WORKSHOP";
  const subject = workshop ? "Verify your Workshop Access" : "Verify your Attendance";
  const cta = workshop ? "Verify Workshop Access" : "Verify Attendance";
  const html = `<p>Hello ${escapeHtml(participantName)},</p><p><a href="${escapeHtml(verificationUrl)}">${cta}</a></p><p>This link expires soon.</p>`;

  try {
    await sendEmail({ to, subject, html });
  } catch {
    throw new ApplicationError("EXTERNAL_PROVIDER_ERROR", 502, "Unable to send verification email");
  }
}
