import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AboutHero from "@/components/AboutHero";
import AboutGallery from "@/components/AboutGallery";

export const metadata: Metadata = {
  title: "About Us — STEI-K'25",
  description:
    "Kenali STEI-K'25, keluarga mahasiswa baru Informatika ITB angkatan 2025.",
};

export default function AboutPage() {
  return (
    <main>
      <Navbar />
      <AboutHero />
      <AboutGallery />
    </main>
  );
}