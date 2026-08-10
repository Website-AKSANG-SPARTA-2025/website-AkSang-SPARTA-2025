import { Resend } from "resend";

import { requiredEnv } from "./env";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(message: EmailMessage): Promise<void> {
  const result = await new Resend(requiredEnv("RESEND_API_KEY")).emails.send({
    from: requiredEnv("EMAIL_FROM"),
    ...message,
  });

  if (result.error) throw new Error("Email provider rejected the request");
}
