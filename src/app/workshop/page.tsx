"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SelectionCard } from "./_components/selection-card";
import { FinalisasiPilihanCard } from "./_components/finalisasi-pilihan-card"; // unused rn
import { cn } from "@/lib/cn";

const SURFACE = "bg-[#5d5a88]";

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
      <div className="min-h-screen flex flex-col bg-[#444444] bg-[url('/bg-workshop.png')] bg-[length:100%] bg-top bg-no-repeat font-sans text-white">
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
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
