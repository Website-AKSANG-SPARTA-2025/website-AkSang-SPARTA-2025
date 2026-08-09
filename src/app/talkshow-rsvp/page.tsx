import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TextInputField from "@/components/TextInputField";
import { Button } from "@/components/ui/button";

export default function TalkshowRSVPPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F9]">
      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Banner Section */}
        <div className="w-full h-48 md:h-64 bg-gradient-to-br from-gray-400 to-gray-200 rounded-3xl shadow-sm">
          {/* Placeholder for actual image banner */}
        </div>

        {/* Separator Gradient */}
        <div className="w-full h-6 rounded-full bg-gradient-to-r from-purple-500 to-gray-300"></div>

        {/* Header Section */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-navy mb-4 font-science">
            Pendaftaran Talkshow
          </h1>
          <p className="text-base text-navy/70 leading-relaxed font-jetbrains">
            AI for Impact is an initiative that brings together students,
            researchers, and professionals to explore how artificial
            intelligence can solve environmental, social, and humanitarian
            challenges.
          </p>
        </div>

        {/* Form Section */}
        <form className="w-full flex flex-col gap-6">
          {/* Card 1: Nama */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="h-3 w-full bg-gradient-to-r from-[#9F55FF] to-[#D5B3FF]"></div>
            <div className="p-6 md:p-8">
              <TextInputField
                label="Nama Lengkap"
                placeholder="Masukkan nama lengkap Anda"
                required
              />
            </div>
          </div>

          {/* Card 2 & 3: Email and Phone (Side by side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
              <TextInputField
                label="Email"
                type="email"
                placeholder="Masukkan email Anda"
                required
              />
            </div>
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
              <TextInputField
                label="Nomor Telepon"
                type="tel"
                placeholder="Masukkan nomor telepon aktif"
                required
              />
            </div>
          </div>

          {/* Card 4: Remaining Fields and Submit */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm flex flex-col gap-6">
            <TextInputField
              label="Asal Instansi / Universitas"
              placeholder="Masukkan institusi Anda"
              required
            />
            <TextInputField
              label="Jurusan / Bidang Studi"
              placeholder="Masukkan jurusan Anda"
            />
            <TextInputField
              label="Alasan Mengikuti Talkshow"
              placeholder="Tuliskan alasan Anda secara singkat"
            />

            <div className="flex justify-end mt-4">
              <Button
                type="submit"
                className="bg-[#59557F] hover:bg-[#474366] text-white rounded-xl px-8 py-6 font-jetbrains font-bold flex items-center gap-2 transition-all shadow-md"
              >
                Tombol daftar
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
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
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
