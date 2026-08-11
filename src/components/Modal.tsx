"use client";

import { Check, X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  type: "success" | "error";
  onClose: () => void;
  onPrimaryClick?: () => void;
}

export default function Modal({
  isOpen,
  type,
  onClose,
  onPrimaryClick,
}: ModalProps) {
  if (!isOpen) return null;

  const isSuccess = type === "success";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] rounded-[20px] bg-white px-6 py-8 shadow-xl sm:px-12 sm:py-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              isSuccess ? "bg-[#4B3FFF]" : "bg-[#2F55B5]"
            }`}
          >
            {isSuccess ? (
              <Check className="h-7 w-7 text-white" strokeWidth={3} />
            ) : (
              <X className="h-7 w-7 text-white" strokeWidth={3} />
            )}
          </div>

          <h2 className="text-2xl font-bold text-[#2F55B5] sm:text-3xl">
            {isSuccess ? "Reservasi Berhasil" : "Reservasi Gagal"}
          </h2>
        </div>

        <div className="mt-8 text-center text-base leading-7 text-zinc-800 sm:text-lg">
          {isSuccess ? (
            <>
              <p>Reservasi Talkshow / Workshop berhasil!</p>
              <p>
                Silakan cek email atau WhatsApp untuk informasi lebih lanjut.
              </p>
            </>
          ) : (
            <>
              <p>Maaf, reservasi Talkshow / Workshop</p>
              <p>tidak dapat diproses.</p>
              <p>Silakan coba lagi atau pilih event lain.</p>
            </>
          )}
        </div>

        <div className="mt-8 flex flex-col-reverse justify-center gap-3 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 min-w-[110px] rounded-full border border-[#6B68A6] bg-white px-6 text-sm font-medium text-[#6B68A6] transition hover:bg-[#F5F4FF]"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={onPrimaryClick}
            className="h-11 min-w-[120px] rounded-full bg-[#6B68A6] px-6 text-sm font-semibold text-white transition hover:bg-[#59568F]"
          >
            {isSuccess ? "Lihat Detail" : "Lihat Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
