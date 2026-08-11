import React from "react";
import Image from "next/image";
import TextInputField from "@/components/TextInputField";
import { Button } from "@/components/ui/button";

export default function TalkshowRSVPPage() {
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
              AI for Impact adalah inisiatif yang mempertemukan mahasiswa,
              peneliti, dan profesional untuk mengeksplorasi bagaimana
              kecerdasan buatan dapat memecahkan tantangan lingkungan, sosial,
              dan kemanusiaan.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <form className="w-full flex flex-col gap-6 md:gap-8">
          {/* Nama Lengkap */}
          <div className="w-full rounded-2xl overflow-hidden shadow-lg">
            <div className="h-8 md:h-10 w-full bg-gradient-to-r from-[#2247B0] to-[#9BDBFF]"></div>
            <div className="bg-white p-6 md:p-8">
              <TextInputField label="Nama Lengkap" placeholder="" required />
            </div>
          </div>

          {/* Row: WA & Institusi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="w-full rounded-2xl overflow-hidden shadow-lg">
              <div className="h-8 md:h-10 w-full bg-gradient-to-r from-[#2247B0] to-[#9BDBFF]"></div>
              <div className="bg-white p-6 md:p-8">
                <TextInputField
                  label="Email Aktif"
                  type="tel"
                  placeholder=""
                  required
                />
              </div>
            </div>

            <div className="w-full rounded-2xl overflow-hidden shadow-lg">
              <div className="h-8 md:h-10 w-full bg-gradient-to-r from-[#2247B0] to-[#9BDBFF]"></div>
              <div className="bg-white p-6 md:p-8">
                <TextInputField
                  label="Asal Institusi"
                  placeholder=""
                  required
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="w-full rounded-2xl overflow-hidden shadow-lg">
            <div className="h-8 md:h-10 w-full bg-gradient-to-r from-[#2247B0] to-[#9BDBFF]"></div>
            <div className="bg-white p-6 md:p-8">
              <TextInputField
                label="Status"
                placeholder="Misal : Mahasiswa"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-4">
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#2247B0] to-[#9BDBFF] hover:opacity-90 text-[#0D1027] rounded-full px-8 py-6 font-jetbrains font-bold tracking-[-0.1em] flex items-center gap-2 transition-all shadow-xl text-base w-full md:w-auto justify-center"
            >
              Tandai Hadir
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
