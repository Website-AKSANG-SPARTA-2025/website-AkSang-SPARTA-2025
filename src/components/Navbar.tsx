import React from "react";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">
            Logo
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-navy">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <div className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
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
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
          <Link href="/tugas" className="hover:text-primary transition-colors">
            Task
          </Link>
        </div>

        {/* Spacer for centering links on desktop */}
        <div className="w-10 hidden md:block"></div>
      </div>
    </nav>
  );
}
