"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

const MAX_SIZE_MB = 10;

/** Matches EventCard and DetailTugasCard so the whole page reads as one set. */
const CARD = "bg-gradient-to-b from-[#9BDBFF] to-[#4A90E2]";
const PILL =
  "rounded-full bg-gradient-to-r from-[#2247B0] to-[#9BDBFF] px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110";

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type SubmissionFormProps = {
  /** Lifted so the page's Kumpulkan button can submit the chosen file. */
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
};

export default function SubmissionForm({
  file,
  onFileChange,
  disabled = false,
}: SubmissionFormProps) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(candidate: File | undefined) {
    if (!candidate) return;
    if (candidate.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Ukuran file melebihi ${MAX_SIZE_MB} MB`);
      return;
    }
    setError(null);
    onFileChange(candidate);
  }

  function clearFile() {
    onFileChange(null);
    setError(null);
    // Without this the same file cannot be re-picked: <input type="file">
    // fires no change event when the value is identical to last time.
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section
      className={cn(
        "flex w-full flex-col gap-4 rounded-3xl p-6 shadow-lg md:p-8",
        CARD,
      )}
    >
      <h2 className="text-lg font-bold text-[#0D1027] md:text-xl">
        Pengumpulan
      </h2>

      <textarea
        name="catatan"
        placeholder="Tulis Jawaban/Catatan"
        disabled={disabled}
        className="h-28 w-full resize-none rounded-2xl border-none bg-white p-4 text-sm text-[#0D1027] placeholder:text-blue-400 focus:ring-2 focus:ring-blue-700 focus:outline-none"
      />

      {/* Hidden input drives both states; the labels/buttons below trigger it. */}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        disabled={disabled}
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl bg-white p-8 text-center">
        {file ? (
          <>
            <p className="text-sm font-bold text-[#0D1027]">
              Lampiran Jawaban Tugas
            </p>
            <p className="max-w-full truncate text-sm text-blue-700">
              {file.name}
            </p>
            <p className="text-xs text-neutral-500">{formatSize(file.size)}</p>
            <button
              type="button"
              onClick={clearFile}
              disabled={disabled}
              className={PILL}
            >
              Hapus File
            </button>
          </>
        ) : (
          <>
            <p className="text-base font-bold text-[#0D1027]">
              Pilih sebuah file untuk diunggah
            </p>
            <p className="text-sm text-neutral-500">
              Unggah satu file dengan ukuran maksimal {MAX_SIZE_MB} MB
            </p>
            {error ? (
              <p role="alert" className="text-xs font-medium text-red-600">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className={PILL}
            >
              Unggah dokumen
            </button>
          </>
        )}
      </div>
    </section>
  );
}
