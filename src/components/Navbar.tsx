"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="w-full bg-[#0D1027] border-b border-white/10 sticky top-0 z-50 px-6 py-4 text-white font-jetbrains">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/logo_kegiatan.png"
            alt="Aegis — beranda"
            width={206}
            height={68}
            priority
            className="h-auto w-[110px] object-contain md:w-[130px]"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-10 text-sm font-bold tracking-wide">
          <Link href="/" className="hover:text-blue-300 transition-colors">
            Home
          </Link>
          <div className="flex items-center gap-1 cursor-pointer hover:text-blue-300 transition-colors group relative">
            <span>Events</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
          <Link href="/tugas" className="hover:text-blue-300 transition-colors">
            Task
          </Link>
        </div>

        {/* Desktop Right Spacer / Auth Button Placeholder */}
        <div className="w-24 hidden md:block"></div>

        {/* Mobile Hamburger Menu Button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white hover:text-blue-300 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-[#110B29] border-t border-white/10 flex flex-col p-4 shadow-xl">
          <Link
            href="/"
            className="px-4 py-3 hover:bg-white/5 rounded-lg transition-colors"
          >
            Home
          </Link>
          <Link
            href="/events"
            className="px-4 py-3 hover:bg-white/5 rounded-lg transition-colors"
          >
            Events
          </Link>
          <Link
            href="/tugas"
            className="px-4 py-3 hover:bg-white/5 rounded-lg transition-colors"
          >
            Task
          </Link>
        </div>
      )}
    </nav>
  );
}
