"use client";

import { useEffect, useState } from "react";

import { readApiResult, retryAfterFrom } from "../../../lib/dev-api-tester";

type AttendeeType = "STUDENT" | "PUBLIC";
type CompetitionPath = "CTF" | "BCC" | "CP";
type VerificationPurpose = "ATTENDANCE" | "WORKSHOP";

type ApiTestResult = {
  label: string;
  status: number | null;
  ok: boolean;
  body: unknown;
};

const paths: CompetitionPath[] = ["CTF", "BCC", "CP"];
const inputClassName = "mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";
const buttonClassName = "rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50";

export default function ApiTester() {
  const [attendance, setAttendance] = useState({
    name: "Ada Lovelace",
    email: "ada@example.com",
    attendeeType: "STUDENT" as AttendeeType,
    institution: "Bina Nusantara",
  });
  const [workshop, setWorkshop] = useState({
    name: "Ada Lovelace",
    email: "ada@example.com",
    competitionPath: "CTF" as CompetitionPath,
    phoneNumber: "+62812345678",
    nim: "",
  });
  const [resendEmail, setResendEmail] = useState("ada@example.com");
  const [resendPurpose, setResendPurpose] = useState<VerificationPurpose>("ATTENDANCE");
  const [submissionPath, setSubmissionPath] = useState<CompetitionPath>("CTF");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [result, setResult] = useState<ApiTestResult | null>(null);

  const busy = pending !== null;

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setResendCooldown((value) => Math.max(0, value - 1));
    }, 1_000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function runRequest(label: string, url: string, init: RequestInit, isResend = false) {
    setPending(label);

    try {
      const response = await fetch(url, { credentials: "include", ...init });
      const apiResult = await readApiResult(response);
      setResult({ label, ...apiResult });

      if (isResend && apiResult.status === 429) {
        setResendCooldown(retryAfterFrom(apiResult.body) ?? 0);
      }
    } catch {
      setResult({ label, status: null, ok: false, body: { message: "Request failed" } });
    } finally {
      setPending(null);
    }
  }

  function jsonRequest(label: string, url: string, body: unknown, isResend = false) {
    return runRequest(
      label,
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      isResend,
    );
  }

  const attendanceBody = {
    name: attendance.name,
    email: attendance.email,
    attendeeType: attendance.attendeeType,
    ...(attendance.institution.trim() ? { institution: attendance.institution } : {}),
  };
  const workshopBody = {
    name: workshop.name,
    email: workshop.email,
    competitionPath: workshop.competitionPath,
    phoneNumber: workshop.phoneNumber,
    ...(workshop.nim.trim() ? { nim: workshop.nim } : {}),
  };
  const workshopRegistrationBody = {
    competitionPath: workshop.competitionPath,
    phoneNumber: workshop.phoneNumber,
    ...(workshop.nim.trim() ? { nim: workshop.nim } : {}),
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6 text-zinc-900">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Development only</p>
        <h1 className="text-3xl font-bold">SPARTA API Tester</h1>
        <p className="max-w-3xl text-sm text-zinc-600">
          Each button sends a live same-origin request. Use test email addresses: attendance,
          enrollment, and resend can ask Aegis to send email.
        </p>
      </header>

      <section className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Session limitation:</strong> Aegis verification does not issue a browser session in
        this backend yet. Public routes can be tested fully; session-required actions commonly
        return 401 in a fresh browser. This page intentionally does not bypass that limit.
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded border border-zinc-200 p-4">
          <div>
            <h2 className="font-semibold">Attendance</h2>
            <p className="text-sm text-zinc-600">POST /api/attendances</p>
          </div>
          <label className="block text-sm font-medium">
            Name
            <input className={inputClassName} value={attendance.name} onChange={(event) => setAttendance({ ...attendance, name: event.target.value })} />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input className={inputClassName} type="email" value={attendance.email} onChange={(event) => setAttendance({ ...attendance, email: event.target.value })} />
          </label>
          <label className="block text-sm font-medium">
            Attendee type
            <select className={inputClassName} value={attendance.attendeeType} onChange={(event) => setAttendance({ ...attendance, attendeeType: event.target.value as AttendeeType })}>
              <option value="STUDENT">STUDENT</option>
              <option value="PUBLIC">PUBLIC</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Institution
            <input className={inputClassName} value={attendance.institution} onChange={(event) => setAttendance({ ...attendance, institution: event.target.value })} />
          </label>
          <button className={buttonClassName} disabled={busy} onClick={() => void jsonRequest("POST /api/attendances", "/api/attendances", attendanceBody)}>
            {pending === "POST /api/attendances" ? "Sending…" : "POST /api/attendances"}
          </button>
          <button className={buttonClassName} disabled={busy} onClick={() => void jsonRequest("POST /api/attendances/confirm", "/api/attendances/confirm", { attendeeType: attendance.attendeeType, ...(attendance.institution.trim() ? { institution: attendance.institution } : {}) })}>
            {pending === "POST /api/attendances/confirm" ? "Sending…" : "POST /api/attendances/confirm (session)"}
          </button>
        </section>

        <section className="space-y-4 rounded border border-zinc-200 p-4">
          <div>
            <h2 className="font-semibold">Verification</h2>
            <p className="text-sm text-zinc-600">Resend is public; status is session-bound.</p>
          </div>
          <label className="block text-sm font-medium">
            Resend email
            <input className={inputClassName} type="email" value={resendEmail} onChange={(event) => setResendEmail(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Purpose
            <select className={inputClassName} value={resendPurpose} onChange={(event) => setResendPurpose(event.target.value as VerificationPurpose)}>
              <option value="ATTENDANCE">ATTENDANCE</option>
              <option value="WORKSHOP">WORKSHOP</option>
            </select>
          </label>
          <button className={buttonClassName} disabled={busy || resendCooldown > 0} onClick={() => void jsonRequest("POST /api/verifications/resend", "/api/verifications/resend", { email: resendEmail, purpose: resendPurpose }, true)}>
            {resendCooldown > 0 ? `Retry in ${resendCooldown}s` : pending === "POST /api/verifications/resend" ? "Sending…" : "POST /api/verifications/resend"}
          </button>
          <button className={buttonClassName} disabled={busy} onClick={() => void runRequest("GET /api/verifications/status", "/api/verifications/status", { method: "GET" })}>
            {pending === "GET /api/verifications/status" ? "Checking…" : "GET /api/verifications/status (session)"}
          </button>
        </section>

        <section className="space-y-4 rounded border border-zinc-200 p-4">
          <div>
            <h2 className="font-semibold">Workshop</h2>
            <p className="text-sm text-zinc-600">Enrollment is public; registration needs a verified session.</p>
          </div>
          <label className="block text-sm font-medium">
            Name
            <input className={inputClassName} value={workshop.name} onChange={(event) => setWorkshop({ ...workshop, name: event.target.value })} />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input className={inputClassName} type="email" value={workshop.email} onChange={(event) => setWorkshop({ ...workshop, email: event.target.value })} />
          </label>
          <label className="block text-sm font-medium">
            Competition path
            <select className={inputClassName} value={workshop.competitionPath} onChange={(event) => setWorkshop({ ...workshop, competitionPath: event.target.value as CompetitionPath })}>
              {paths.map((path) => <option key={path} value={path}>{path}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Phone number
            <input className={inputClassName} value={workshop.phoneNumber} onChange={(event) => setWorkshop({ ...workshop, phoneNumber: event.target.value })} />
          </label>
          <label className="block text-sm font-medium">
            NIM (optional)
            <input className={inputClassName} value={workshop.nim} onChange={(event) => setWorkshop({ ...workshop, nim: event.target.value })} />
          </label>
          <button className={buttonClassName} disabled={busy} onClick={() => void jsonRequest("POST /api/workshops/enroll", "/api/workshops/enroll", workshopBody)}>
            {pending === "POST /api/workshops/enroll" ? "Sending…" : "POST /api/workshops/enroll"}
          </button>
          <button className={buttonClassName} disabled={busy} onClick={() => void jsonRequest("POST /api/workshops/register", "/api/workshops/register", workshopRegistrationBody)}>
            {pending === "POST /api/workshops/register" ? "Sending…" : "POST /api/workshops/register (session)"}
          </button>
          <a className={`${buttonClassName} inline-block`} href="/api/workshops/invitation">
            GET /api/workshops/invitation (session)
          </a>
        </section>

        <section className="space-y-4 rounded border border-zinc-200 p-4">
          <div>
            <h2 className="font-semibold">Submission</h2>
            <p className="text-sm text-zinc-600">Requires a verified session and active workshop registration.</p>
          </div>
          <label className="block text-sm font-medium">
            Competition path
            <select className={inputClassName} value={submissionPath} onChange={(event) => setSubmissionPath(event.target.value as CompetitionPath)}>
              {paths.map((path) => <option key={path} value={path}>{path}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">
            PDF file
            <input className={inputClassName} type="file" accept="application/pdf" onChange={(event) => setSubmissionFile(event.target.files?.[0] ?? null)} />
          </label>
          <button
            className={buttonClassName}
            disabled={busy}
            onClick={() => {
              if (!submissionFile) {
                setResult({ label: "POST /api/submissions", status: null, ok: false, body: { message: "Choose a PDF file first" } });
                return;
              }

              const form = new FormData();
              form.set("competitionPath", submissionPath);
              form.set("file", submissionFile);
              void runRequest("POST /api/submissions", "/api/submissions", { method: "POST", body: form });
            }}
          >
            {pending === "POST /api/submissions" ? "Uploading…" : "POST /api/submissions (session)"}
          </button>
        </section>
      </div>

      <section className="rounded border border-zinc-200 p-4">
        <h2 className="font-semibold">Last response</h2>
        <pre aria-live="polite" className="mt-3 overflow-x-auto rounded bg-zinc-950 p-4 text-sm text-zinc-100">
          {result
            ? `${result.label}\nstatus: ${result.status ?? "network/client error"}\nok: ${result.ok}\n\n${typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2)}`
            : "No request sent yet."}
        </pre>
      </section>
    </main>
  );
}
