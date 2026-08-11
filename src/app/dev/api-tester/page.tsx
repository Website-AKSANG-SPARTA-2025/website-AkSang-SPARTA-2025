import { notFound } from "next/navigation";

import { isDevelopmentApiTester } from "../../../lib/dev-api-tester";

import ApiTester from "./api-tester";

export default function DevelopmentApiTesterPage() {
  if (!isDevelopmentApiTester(process.env.NODE_ENV)) notFound();

  return <ApiTester />;
}
