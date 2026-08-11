"use client";

import React from "react";
import TextInputField from "@/components/TextInputField";
import { Button } from "@/components/ui/button";
import { createAttendance } from "@/api/attendances";
import { useSubmit } from "@/utils/use-submit";

const FIELD_SHELL = "w-full rounded-2xl overflow-hidden shadow-lg";
const FIELD_HEADER =
  "h-8 md:h-10 w-full bg-gradient-to-r from-[#2247B0] to-[#9BDBFF]";

export default function PresensiPage() {
  const { state, run, submitting } = useSubmit();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const institution = String(form.get("institution") ?? "").trim();
    const attendeeType = String(form.get("attendeeType") ?? "") as
      "STUDENT" | "PUBLIC";

    void run(async () => {
      const result = await createAttendance({
        name: String(form.get("name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        attendeeType,
        // Omit rather than send "" — the schema is .strict() and expects
        // institution to be absent or a non-empty string.
        ...(institution ? { institution } : {}),
      });

      return (
        result.message ??
        (result.status === 202
          ? "Cek emailmu untuk verifikasi."
          : "Presensi tercatat.")
      );
    });
  }

  return (
    <div className="relative isolate min-h-screen flex flex-col pt-32 pb-16 overflow-x-hidden">
      {/* Base Space Background */}
      <div className="fixed inset-0 -z-20 bg-[#0D1027]">
        <div className="absolute inset-0 bg-[url('/starry_bg.jpg')] bg-cover bg-center opacity-80"></div>
      </div>

      {/* Planet Layer (matching home page) */}
      <div className="absolute inset-x-0 top-0 w-full flex justify-center pointer-events-none -z-10 hidden md:block overflow-hidden h-full">
        <div className="relative w-full max-w-[1440px] h-full">
          <img
            src="/planet1.png"
            alt="Planet Decoration"
            className="absolute top-[-294px] right-[-250px] w-[696px] h-auto object-contain max-w-none opacity-90"
          />
        </div>
      </div>

      <main className="relative flex-1 w-full max-w-4xl mx-auto px-6 flex flex-col gap-8 z-10">
        {/* Title Section */}
        <div className="w-full rounded-2xl overflow-hidden shadow-xl">
          <div className="h-8 md:h-12 w-full bg-gradient-to-r from-[#2247B0] to-[#9BDBFF]"></div>
          <div className="bg-white p-6 md:p-10">
            <h1 className="font-heading text-4xl md:text-5xl font-black text-[#0D1027] mb-4 uppercase tracking-[-0.05em]">
              FORM PRESENSI
            </h1>
            <p className="font-jetbrains text-sm md:text-base text-gray-700 leading-relaxed font-medium tracking-[-0.1em]">
              Catat kehadiranmu di sini untuk memvalidasi partisipasi aktifmu
              dalam rangkaian acara AI for Impact.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-6 md:gap-8"
        >
          {/* Nama Lengkap */}
          <div className={FIELD_SHELL}>
            <div className={FIELD_HEADER}></div>
            <div className="bg-white p-6 md:p-8">
              <TextInputField
                label="Nama Lengkap"
                name="name"
                minLength={2}
                maxLength={100}
                required
                disabled={submitting}
              />
            </div>
          </div>

          {/* Row: Email & Institusi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className={FIELD_SHELL}>
              <div className={FIELD_HEADER}></div>
              <div className="bg-white p-6 md:p-8">
                <TextInputField
                  label="Email Aktif"
                  name="email"
                  type="email"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className={FIELD_SHELL}>
              <div className={FIELD_HEADER}></div>
              <div className="bg-white p-6 md:p-8">
                <TextInputField
                  label="Asal Institusi"
                  name="institution"
                  required
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* Status — the API takes an enum, so this is a select not free text */}
          <div className={FIELD_SHELL}>
            <div className={FIELD_HEADER}></div>
            <div className="bg-white p-6 md:p-8">
              <div className="w-full">
                <label
                  htmlFor="attendeeType"
                  className="block font-bold mb-2 tracking-tight text-[#0D1027]"
                >
                  Status
                </label>
                <select
                  id="attendeeType"
                  name="attendeeType"
                  defaultValue="STUDENT"
                  required
                  disabled={submitting}
                  className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-jetbrains tracking-[-0.1em] focus:ring-2 focus:ring-primary outline-none transition-all text-[#0D1027]"
                >
                  <option value="STUDENT">Mahasiswa / Pelajar</option>
                  <option value="PUBLIC">Umum</option>
                </select>
              </div>
            </div>
          </div>

          {state.kind === "error" ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 font-jetbrains text-sm font-medium text-red-700"
            >
              {state.message}
            </p>
          ) : null}

          {state.kind === "success" ? (
            <p
              role="status"
              className="rounded-xl bg-green-50 px-4 py-3 font-jetbrains text-sm font-medium text-green-800"
            >
              {state.message}
            </p>
          ) : null}

          {/* Submit Button */}
          <div className="flex justify-end mt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-[#2247B0] to-[#9BDBFF] hover:opacity-90 text-[#0D1027] rounded-full px-8 py-6 font-jetbrains font-bold tracking-[-0.1em] flex items-center gap-2 transition-all shadow-xl text-base w-full md:w-auto justify-center disabled:opacity-60"
            >
              {submitting ? "Mengirim..." : "Tandai Hadir"}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
