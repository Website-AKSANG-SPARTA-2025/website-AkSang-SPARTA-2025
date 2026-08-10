import { errorResponse } from "../../../../lib/api";
import { setParticipantSessionCookie } from "../../../../lib/session";
import { verifyEmailSchema } from "../../../../schemas";
import { verifyToken } from "../../../../services/verification.service";

export async function GET(request: Request): Promise<Response> {
  try {
    const token = verifyEmailSchema.parse({
      token: new URL(request.url).searchParams.get("token") ?? "",
    }).token;
    const verification = await verifyToken(token);
    const location = new URL(
      verification.purpose === "ATTENDANCE" ? "/event?verified=true" : "/workshop?verified=true",
      request.url,
    ).toString();
    const response = new Response(null, { status: 302, headers: { Location: location } });
    return await setParticipantSessionCookie(response, verification.participantId);
  } catch (error) {
    return errorResponse(error);
  }
}
