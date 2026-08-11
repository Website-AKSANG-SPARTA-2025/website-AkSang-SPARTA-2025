import { notFound } from "next/navigation";

import TugasContent from "./_components/TugasContent";

/**
 * Not public yet. Mirrors the gate on /dev/api-tester: the route 404s outside
 * development, so the page is reachable locally while the work continues but
 * invisible in any deployed build. Delete this guard to launch it.
 */
export default function TugasPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return <TugasContent />;
}
