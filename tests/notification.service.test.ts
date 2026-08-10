import { beforeEach, describe, expect, it, vi } from "vitest";

const sender = vi.hoisted(() => ({ sendEmail: vi.fn() }));

vi.mock("../lib/email", () => ({ sendEmail: sender.sendEmail }));

import { sendVerificationEmail } from "../services/notification.service";

const attendanceInput = {
  to: "ada@example.com",
  participantName: "Ada <Lovelace>",
  verificationUrl: "https://example.test/verify?token=secret",
  purpose: "ATTENDANCE" as const,
};

beforeEach(() => {
  sender.sendEmail.mockReset();
});

describe("verification notifications", () => {
  it("sends an escaped Attendance verification email through the adapter", async () => {
    await expect(sendVerificationEmail(attendanceInput)).resolves.toBeUndefined();

    expect(sender.sendEmail).toHaveBeenCalledTimes(1);
    expect(sender.sendEmail).toHaveBeenCalledWith({
      to: "ada@example.com",
      subject: "Verify your Attendance",
      html: expect.stringContaining("Verify Attendance"),
    });
    const [{ html }] = sender.sendEmail.mock.calls[0];
    expect(html).toContain("Ada &lt;Lovelace&gt;");
    expect(html).toContain(`href="${attendanceInput.verificationUrl}"`);
    expect(html).toContain("This link expires soon.");
    expect(html).not.toMatch(/otp/i);
  });

  it("uses the workshop-specific CTA", async () => {
    await sendVerificationEmail({ ...attendanceInput, purpose: "WORKSHOP" });

    const [{ subject, html }] = sender.sendEmail.mock.calls[0];
    expect(subject).toBe("Verify your Workshop Access");
    expect(html).toContain("Verify Workshop Access");
  });

  it("rejects incomplete server-only email input before calling the adapter", async () => {
    await expect(sendVerificationEmail({ ...attendanceInput, to: "  " })).rejects.toMatchObject({
      status: 400,
    });
    await expect(sendVerificationEmail({ ...attendanceInput, verificationUrl: "" })).rejects.toMatchObject({
      status: 400,
    });

    expect(sender.sendEmail).not.toHaveBeenCalled();
  });

  it("maps provider failures to a safe error without leaking the verification URL", async () => {
    sender.sendEmail.mockRejectedValue(new Error(`Provider rejected ${attendanceInput.verificationUrl}`));

    await expect(sendVerificationEmail(attendanceInput)).rejects.toMatchObject({
      status: 502,
      message: "Unable to send verification email",
    });
  });
});
