export type DispatchVerificationInput = {
  participantId: string;
  purpose: "RSVP" | "WORKSHOP";
};

/**
 * Purpose-bound verification-dispatch seam (owned by BE-03B).
 *
 * BE-04/BE-05 replace this no-op stub with the real verification-link +
 * email dispatch under the approved integration exception. The call sites in
 * `app/api/rsvps/route.ts` and `app/api/workshops/enroll/route.ts` stay
 * frozen; only this module's body is wired later.
 */
export async function dispatchVerificationLink(
  input: DispatchVerificationInput,
): Promise<void> {
  // Stub: BE-04/BE-05 replace this body with the real dispatch. `input` is
  // intentionally unused until then.
  void input;
}
