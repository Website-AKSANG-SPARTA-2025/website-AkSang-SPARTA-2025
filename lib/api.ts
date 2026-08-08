import { z, ZodError } from "zod";

import { ApplicationError } from "../errors/application-error";

export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        400,
        "Invalid request payload",
      );
    }
    throw error;
  }

  return schema.parse(body);
}

export function successResponse<T>(
  data: T,
  message?: string,
  init?: ResponseInit,
): Response {
  return Response.json({ success: true, ...(message ? { message } : {}), data }, init);
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      {
        success: false,
        message: "Invalid request payload",
        errors: z.flattenError(error),
      },
      { status: 400 },
    );
  }

  if (error instanceof ApplicationError) {
    return Response.json(
      {
        success: false,
        message: error.message,
        ...(error.details === undefined ? {} : { errors: error.details }),
      },
      { status: error.status },
    );
  }

  return Response.json(
    { success: false, message: "Internal server error" },
    { status: 500 },
  );
}
