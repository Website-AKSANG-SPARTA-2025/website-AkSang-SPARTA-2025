"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SelectionCard } from "./_components/selection-card";

const competitions = [
  {
    id: "A",
    title: "Capture The Flag",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    slot_remaining: 100,
    slot_max: 100,
  },
  {
    id: "B",
    title: "Competitive Programming",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    slot_remaining: 100,
    slot_max: 100,
  },
  {
    id: "C",
    title: "Business Case Competition",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    slot_remaining: 100,
    slot_max: 100,
  },
];

// yes this if vibecoded, gomenasai!

export default function WorkshopPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(
    null,
  );

  const [timeLeft, setTimeLeft] = useState({
    Days: "00",
    Hours: "00",
    Minutes: "00",
    Seconds: "00",
  });

  useEffect(() => {
    // Modify this target date to whatever you need!
    const targetDate = new Date("2026-08-12T00:00:00").getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ Days: "00", Hours: "00", Minutes: "00", Seconds: "00" });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({
        Days: String(days).padStart(2, "0"),
        Hours: String(hours).padStart(2, "0"),
        Minutes: String(minutes).padStart(2, "0"),
        Seconds: String(seconds).padStart(2, "0"),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-[#bd7cff] font-sans text-slate-800">
        <div className="max-w-4xl w-full mx-auto space-y-12 pb-20 pt-8 md:pt-16 px-4 sm:px-6 lg:px-8 flex-grow">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#484566]">
              Pendaftaran Workshop
            </h1>
            <p className="text-sm md:text-base text-slate-600 max-w-xl mx-auto">
              Pilih satu paket Career Path dan satu paket Competition Path.
              <br className="hidden md:block" />
              Setelah difinalisasi, pilihan tidak bisa diubah lagi.
            </p>
          </div>

          {/* Countdown Section */}
          <div className="flex justify-center gap-4 md:gap-8">
            {[
              { label: "Days", value: timeLeft.Days },
              { label: "Hours", value: timeLeft.Hours },
              { label: "Minutes", value: timeLeft.Minutes },
              { label: "Seconds", value: timeLeft.Seconds },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center space-y-2">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-[#64617F] text-white rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-bold shadow-md">
                  {item.value}
                </div>
                <span className="text-xs md:text-sm font-bold text-blue-600">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Competition Path Section */}
          <div className="bg-[#64617F] rounded-3xl p-6 md:p-10 text-white shadow-xl">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Competition Path
              </h2>
              <p className="text-sm text-white/80 mt-1">
                Pilih satu competition.
              </p>
            </div>

            <div className="space-y-6">
              {competitions.map((comp) => (
                <SelectionCard
                  key={comp.id}
                  option={comp.id}
                  title={comp.title}
                  description={comp.description}
                  slot_remaining={comp.slot_remaining}
                  slot_max={comp.slot_max}
                  isSelected={selectedCompetition === comp.id}
                  onSelect={() =>
                    setSelectedCompetition(
                      comp.id === selectedCompetition ? null : comp.id,
                    )
                  }
                />
              ))}
            </div>
          </div>

          {/* Finalisasi section */}
        </div>
        <Footer />
      </div>
    </>
  );
}
