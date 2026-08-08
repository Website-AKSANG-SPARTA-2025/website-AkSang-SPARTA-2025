export type ApplicationErrorStatus = 400 | 401 | 403 | 404 | 409 | 410 | 429 | 500 | 502;

export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: ApplicationErrorStatus,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
