"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SelectionCard } from "./_components/selection-card";
import { FinalisasiPilihanCard } from "./_components/finalisasi-pilihan-card"; // unused rn
import { cn } from "@/lib/cn";
import { Checkbox } from "@/components/ui/checkbox";
import TextInputField from "@/components/TextInputField";
import { Button } from "@/components/ui/button";

const SURFACE = "bg-[#5d5a88]";
const ACTION =
  "bg-gradient-to-r from-[#2247B0] to-[#9BDBFF] hover:brightness-110";

const careerPaths = [
  {
    id: "CP1",
    title: "Cybersecurity",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    slot_remaining: 100, // link this with BE stuff, idk how lmao
    slot_max: 100,
  },
  {
    id: "CP2",
    title: "Product Manager",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    slot_remaining: 50,
    slot_max: 100,
  },
  {
    id: "CP3",
    title: "Software Engineer",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    slot_remaining: 0,
    slot_max: 20,
  },
];

// yes this is vibecoded, gomenasai!

export default function WorkshopPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(
    null,
  );
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null);

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col relative font-sans text-white overflow-hidden">
        {/* Base Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#35323c] to-[#0D1027] -z-30" />

        {/* Background Image Layer */}
        <div className="absolute inset-0 bg-[url('/bg-workshop.png')] bg-[length:100%] bg-top bg-no-repeat -z-20" />

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
                AI for impact is an intiative that brings together students,
                researchers, and professionals to explore how Artificial
                Intelligence can solve environmental, social, and humanitarian
                challenges.
              </p>
            </div>

            <div
              className={cn(
                "rounded-3xl p-6 md:p-10 text-white shadow-xl bg-gradient-to-b from-[#2247B0] via-[#79CCFD] to-[#2247B0]",
              )}
            >
              {/* Make regis forms down here */}

              {/* Career Path Section */}
              <div className="mb-4">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Career Path
                </h2>
              </div>

              <div className="space-y-6">
                {careerPaths.map((career) => (
                  <SelectionCard
                    key={career.id}
                    option={career.id.replace("CP", "")}
                    title={career.title}
                    description={career.description}
                    slot_remaining={career.slot_remaining}
                    slot_max={career.slot_max}
                    isSelected={selectedCareer === career.id}
                    onSelect={() =>
                      setSelectedCareer(
                        career.id === selectedCareer ? null : career.id,
                      )
                    }
                  />
                ))}
              </div>

              {/* Konfirmasi Section */}
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">
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
              <div className="mt-8">
                <TextInputField label="Harapan Ke Workshop" />
              </div>
            </div>
            {/* Submit Button */}
            <div className="-mt-3 flex justify-end">
              <Button
                className={cn(
                  "text-[#0D1027] hover:bg-white transition-colors border-none",
                  ACTION,
                )}
              >
                Daftar Workshop &rarr;
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
