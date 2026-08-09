import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-[#E8E6F0] mt-20 px-6 py-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-10">
        {/* Left Section: Logo and Info */}
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 shrink-0 rounded-full bg-white flex flex-col items-center justify-center text-[10px] text-gray-500 font-bold leading-tight">
            <span>Logo</span>
            <span>Kegiatan</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-navy mb-2">
              AI FOR IMPACT 2026
            </h3>
            <p className="text-sm text-navy/70 mb-1">
              Bandung, West Java, Indonesia
            </p>
            <p className="text-xs text-navy/50">Email, Ig, X, etc</p>
          </div>
        </div>

        {/* Right Section: Links */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm font-medium text-navy/80">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <Link
            href="/workshop/pendaftaran"
            className="hover:text-primary transition-colors"
          >
            Workshop
          </Link>

          <Link href="/events" className="hover:text-primary transition-colors">
            Events
          </Link>
          <Link
            href="/talkshow/rsvp"
            className="hover:text-primary transition-colors"
          >
            Talkshow
          </Link>

          <Link href="/tugas" className="hover:text-primary transition-colors">
            Task
          </Link>
          <Link href="/booth" className="hover:text-primary transition-colors">
            Booth
          </Link>
        </div>
      </div>
    </footer>
  );
}
