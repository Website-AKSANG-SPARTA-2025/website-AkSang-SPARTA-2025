import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ApiTester from "../app/dev/api-tester/api-tester";

describe("development API tester screen", () => {
  it("renders every route action and the session limitation", () => {
    const html = renderToStaticMarkup(<ApiTester />);

    expect(html).toContain("POST /api/dev/auth/session");
    expect(html).toContain("POST /api/attendances");
    expect(html).toContain("POST /api/attendances/confirm");
    expect(html).toContain("POST /api/verifications/resend");
    expect(html).toContain("GET /api/verifications/status");
    expect(html).toContain("POST /api/workshops/enroll");
    expect(html).toContain("POST /api/workshops/register");
    expect(html).toContain("GET /api/workshops/invitation");
    expect(html).toContain('href="/api/workshops/invitation"');
    expect(html).toContain("POST /api/submissions");
    expect(html).toContain("does not issue a browser session");
  });
});
