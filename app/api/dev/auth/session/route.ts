import { createHash, timingSafeEqual } from "node:crypto";

import { ApplicationError } from "../../../../../errors/application-error";
import { errorResponse, parseJsonBody, successResponse } from "../../../../../lib/api";
import { getPrisma } from "../../../../../lib/prisma";
import { setParticipantSessionCookie } from "../../../../../lib/session";
import { developmentSessionSchema } from "../../../../../schemas";
import { normalizeEmail } from "../../../../../services/participant.service";

function configuredSecret(): string {
  const secret = process.env.DEV_AUTH_TEST_SECRET;
  if (!secret) {
    throw new ApplicationError("CONFIGURATION_ERROR", 500, "Development auth testing is not configured");
  }
  return secret;
}

function matchesSecret(value: string, expected: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(value).digest(),
    createHash("sha256").update(expected).digest(),
  );
}

export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });

  try {
    const input = await parseJsonBody(request, developmentSessionSchema);
    if (!matchesSecret(input.secret, configuredSecret())) {
      throw new ApplicationError("UNAUTHORIZED", 401, "Invalid development auth secret");
    }

    const participant = await getPrisma().participant.findUnique({
      where: { email: normalizeEmail(input.email) },
    });
    if (!participant) throw new ApplicationError("NOT_FOUND", 404, "Participant not found");
    if (!participant.emailVerifiedAt) {
      throw new ApplicationError("FORBIDDEN", 403, "Email verification is required");
    }

    return setParticipantSessionCookie(
      successResponse({ email: participant.email }, "Development session created"),
      participant.id,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
