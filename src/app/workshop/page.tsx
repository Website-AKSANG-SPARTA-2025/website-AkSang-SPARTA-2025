"use client";

import React, { useState } from "react";
import { SelectionCard } from "./_components/selection-card";
import { cn } from "@/lib/cn";
import { Checkbox } from "@/components/ui/checkbox";
import TextInputField from "@/components/TextInputField";
import { Button } from "@/components/ui/button";
import { enrollWorkshop, type CompetitionPath } from "@/api/workshops";
import { useSubmit } from "@/utils/use-submit";

const ACTION =
  "bg-gradient-to-r from-[#2247B0] to-[#9BDBFF] hover:brightness-110";

/**
 * ids are the CompetitionPath enum values the API accepts — see
 * competitionPathSchema in src/schemas, the Prisma enum, and the
 * WORKSHOP_*_COMMUNITY_LINK env vars that invitationUrlForPath reads. They go
 * on the wire verbatim, so do not replace them with friendly strings.
 */
const competitionPaths = [
  {
    id: "CTF",
    option: "A",
    title: "Capture The Flag",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
  {
    id: "BCC",
    option: "B",
    title: "Business Case Competition",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
  {
    id: "CP",
    option: "C",
    title: "Competitive Programming",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
] satisfies ReadonlyArray<{
  id: CompetitionPath;
  option: string;
  title: string;
  description: string;
}>;

// yes this is vibecoded, gomenasai!

export default function WorkshopPage() {
  const [selectedPath, setSelectedPath] = useState<CompetitionPath | null>(
    null,
  );
  const { state, run, fail, submitting } = useSubmit();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPath) {
      fail("Pilih salah satu competition path.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const nim = String(form.get("nim") ?? "").trim();

    void run(async () => {
      // Only these five keys may be sent — createWorkshopEnrollmentSchema is
      // .strict(), so anything extra fails validation rather than being
      // ignored. The other inputs on this form are not part of the contract.
      const result = await enrollWorkshop({
        name: String(form.get("name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        competitionPath: selectedPath,
        phoneNumber: String(form.get("phoneNumber") ?? "").trim(),
        ...(nim ? { nim } : {}),
      });

      return (
        result.message ??
        (result.status === 202
          ? "Cek emailmu untuk verifikasi."
          : "Pendaftaran tercatat.")
      );
    });
  }

  return (
    <>
      <div className="min-h-screen flex flex-col relative font-sans text-white overflow-hidden">
        {/* Base Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#35323c] to-[#0D1027] -z-30" />

        {/* Background Image Layer */}
        <div className="absolute bg-black inset-0 bg-[url('/bg-workshop.png')] bg-[length:100%] bg-top bg-no-repeat -z-20" />

        {/* Fading Overlay to blend the image seamlessly */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#35323c]/60 to-[#0D1027] -z-10" />

        <div className="flex-grow flex flex-col relative z-0">
          <div className="max-w-4xl w-full mx-auto space-y-12 pb-20 pt-8 md:pt-16 px-4 sm:px-6 lg:px-8 flex-grow">
            {/* Header Section */}
            <div className="text-center space-y-4">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                Form Pendaftaran Workshop
              </h1>
              <p className="text-sm md:text-base text-white/90">
                Silakan lengkapi formulir di bawah ini dengan data yang valid
                untuk mencatatkan kehadiranmu dalam rangkaian kegiatan Aksi
                Angkatan SPARTA 2025: AI for Impact.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div
                className={cn(
                  "rounded-3xl p-6 md:p-8 text-white shadow-xl bg-gradient-to-b from-[#2247B0] via-[#79CCFD] to-[#2247B0]",
                )}
              >
                {/*
                  Only name, email, phoneNumber and nim reach the API. The
                  university/major/year/harapan inputs are collected for the
                  organisers but are NOT part of createWorkshopEnrollmentSchema,
                  which is .strict() and would reject them.
                */}
                <div className="space-y-6 mb-4 text-m text-white">
                  <TextInputField
                    label="Nama Lengkap"
                    name="name"
                    minLength={2}
                    maxLength={100}
                    required
                    disabled={submitting}
                  />
                  <TextInputField
                    label="Email Aktif"
                    name="email"
                    type="email"
                    required
                    disabled={submitting}
                  />
                  <TextInputField
                    label="Nomor WhatsApp Aktif"
                    name="phoneNumber"
                    type="tel"
                    inputMode="tel"
                    // Mirrors phoneNumberSchema: ^\+?[0-9]{8,20}$
                    pattern="\+?[0-9]{8,20}"
                    title="8-20 digit, boleh diawali +"
                    required
                    disabled={submitting}
                  />
                  <TextInputField
                    label="NIM (opsional)"
                    name="nim"
                    disabled={submitting}
                  />
                  <TextInputField
                    label="Asal Universitas/Sekolah"
                    disabled={submitting}
                  />
                  <TextInputField
                    label="Program Studi/Jurusan"
                    disabled={submitting}
                  />
                  <TextInputField
                    label="Angkatan/Tahun Masuk Universitas"
                    disabled={submitting}
                  />
                </div>

                {/* Competition Path Section */}
                <div className="mb-4 mt-8">
                  <h2 className="text-xl font-bold tracking-tight">
                    Competition Path
                  </h2>
                </div>

                <div className="space-y-6">
                  {competitionPaths.map((path) => (
                    <SelectionCard
                      key={path.id}
                      option={path.option}
                      title={path.title}
                      description={path.description}
                      isSelected={selectedPath === path.id}
                      onSelect={() =>
                        setSelectedPath(
                          path.id === selectedPath ? null : path.id,
                        )
                      }
                    />
                  ))}
                </div>

                {/* Konfirmasi Section */}
                <div className="mt-8">
                  <h3 className="text-m font-bold mb-4">
                    Konfirmasi Kesediaan Mengikuti Secara Asinkron
                  </h3>
                  <div className="bg-white rounded-xl p-5 flex items-center gap-4 text-[#2247B0]">
                    <div className="w-6 h-6 rounded-[6px] p-[3px] bg-gradient-to-r from-[#2247B0] to-[#9BDAFF] shrink-0">
                      <Checkbox
                        id="bersedia"
                        className="w-full h-full !border-0 bg-white data-checked:!bg-transparent data-[state=checked]:!bg-transparent text-white rounded-[4px]"
                      />
                    </div>
                    <label
                      htmlFor="bersedia"
                      className="font-bold text-lg cursor-pointer"
                    >
                      Bersedia
                    </label>
                  </div>
                </div>

                {/* Harapan Section */}
                <div className="mt-8 text-m">
                  <TextInputField
                    label="Harapan Ke Workshop"
                    disabled={submitting}
                  />
                </div>
              </div>

              {state.kind === "error" ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {state.message}
                </p>
              ) : null}

              {state.kind === "success" ? (
                <p
                  role="status"
                  className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
                >
                  {state.message}
                </p>
              ) : null}

              {/* Submit Button */}
              <div className="mt-6 flex justify-end">
                <Button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "text-m text-[#0D1027] -p-0 hover:bg-white transition-colors border-none disabled:opacity-60",
                    ACTION,
                  )}
                >
                  {submitting ? "Mengirim..." : "Daftar Workshop →"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
