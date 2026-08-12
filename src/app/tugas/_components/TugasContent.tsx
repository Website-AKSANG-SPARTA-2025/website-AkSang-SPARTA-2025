"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/api/client";
import { createSubmission } from "@/api/submissions";
import type { CompetitionPath } from "@/api/workshops";
import DetailTugasCard from "./DetailTugasCard";
import SubmissionForm from "./SubmissionForm";
import { useSubmit } from "@/utils/use-submit";

// Placeholder until a task source exists. competitionPath must accompany the
// upload, so it has to come from whatever eventually supplies the task.
const TASK = {
  title: "Judul Tugas",
  releaseDate: "Lorem Ipsum Dolor Sit Amet",
  dueDate: "Lorem Ipsum Dolor Sit Amet",
  description: "Deskripsi Tugas",
  competitionPath: "CTF" as CompetitionPath,
};

export default function TugasContent() {
  const [file, setFile] = useState<File | null>(null);
  const { state, run, fail, submitting } = useSubmit();

  function handleSubmit() {
    if (!file) {
      fail("Pilih file PDF terlebih dahulu.");
      return;
    }

    void run(
      async () => {
        const result = await createSubmission({
          competitionPath: TASK.competitionPath,
          file,
        });
        return result.message ?? `Terkirim: ${result.data.fileName}`;
      },
      {
        mapError: (error) =>
          // 401 here means no participant session, which currently can only be
          // created by the development-only auth route.
          error instanceof ApiError && error.status === 401
            ? "Kamu harus login sebagai peserta terverifikasi."
            : undefined,
      },
    );
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-clip pt-16 pb-16">
      {/* Base space background, same treatment as /presensi */}
      <div className="fixed inset-0 -z-20 bg-[#0D1027]">
        <div className="absolute inset-0 bg-[url('/starry_bg.jpg')] bg-cover bg-center opacity-80" />
      </div>

      {/* Planet decoration, desktop only — matches the other pages */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-full w-full justify-center overflow-hidden md:flex">
        <div className="relative h-full w-full max-w-[1440px]">
          <Image
            src="/planet1.png"
            alt=""
            aria-hidden="true"
            width={696}
            height={696}
            className="absolute top-[-294px] right-[-250px] h-auto w-[696px] max-w-none object-contain opacity-90"
          />
        </div>
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-8 px-6">
        <h1 className="font-heading tracking-heading text-center text-4xl font-black text-white uppercase md:text-5xl">
          Detail Tugas
        </h1>

        {/* Wrapper is relative so the robot can hang off the card's right edge */}
        <div className="relative">
          <DetailTugasCard
            title={TASK.title}
            releaseDate={TASK.releaseDate}
            dueDate={TASK.dueDate}
            description={TASK.description}
          />

          {/*
            Side robot peeking past the card's right edge, as in the mockup.
            The page is overflow-x-clip, so the overhang crops cleanly.
          */}
          <Image
            src="/robot_samping.png"
            alt=""
            aria-hidden="true"
            width={542}
            height={1006}
            className="pointer-events-none absolute -right-4 -bottom-16 z-20 h-auto w-[120px] translate-x-1/4 md:-right-10 md:w-[200px]"
          />
        </div>

        <SubmissionForm
          file={file}
          onFileChange={setFile}
          disabled={submitting}
        />

        {state.kind === "error" ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {state.message}
          </p>
        ) : null}

        {state.kind === "success" ? (
          <p
            role="status"
            className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
          >
            {state.message}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-full bg-gradient-to-r from-[#2247B0] to-[#9BDBFF] px-8 py-6 text-base font-bold text-white shadow-xl transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? "Mengirim..." : "Kumpulkan →"}
          </Button>
        </div>
      </main>
    </div>
  );
}
