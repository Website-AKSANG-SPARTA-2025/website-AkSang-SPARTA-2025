"use client";

import { useState } from "react";

const MAX_SIZE_MB = 5;

export default function SubmissionForm() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Ukuran file melebihi ${MAX_SIZE_MB} MB`);
      return;
    }
    setError(null);
    setFile(f);
  };

  return (
    <section className="bg-linear-to-br from-sky-300 to-blue-500 rounded-3xl flex flex-col w-full max-w-2xl p-6 gap-4 shadow-lg">
      <h1 className="text-blue-900 font-bold text-lg">Pengumpulan</h1>

      <textarea
        placeholder="Tulis jawaban atau catatan..."
        className="w-full h-28 rounded-2xl border-none p-4 bg-white text-sm text-blue-700 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
      />

      <div className="bg-white border-2 border-dashed border-neutral-600 rounded-2xl flex flex-col items-center justify-center gap-4 p-10 min-h-55px">
        {file ? (
          <>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="rounded-xl px-5 py-3 w-full max-w-md">
                <p className="text-gray-300 text-xs font-semibold tracking-wide uppercase">
                  File dipilih
                </p>
                <p className="text-blue-900 text-sm font-medium mt-1">
                  {file.name}
                </p>
                <p className="text-neutral-400 text-xs mt-1">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <label className="cursor-pointer bg-blue-800 hover:bg-blue-300 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
                Pilih ulang
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <p className="text-blue-900 font-bold text-lg">
              Pilih sebuah file untuk diunggah
            </p>
            <p className="text-blue-300 text-sm -mt-2">
              Unggah satu file dengan ukuran maksimal {MAX_SIZE_MB} MB
            </p>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <label className="cursor-pointer bg-blue-900 hover:bg-blue-300 text-white text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 transition">
              Unggah dokumen
              <input
                type="file"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
          </>
        )}
      </div>
    </section>
  );
}
