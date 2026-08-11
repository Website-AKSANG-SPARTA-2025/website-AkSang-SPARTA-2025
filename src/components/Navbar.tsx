import React from "react";
import Link from "next/link";

/** Primary Black, per the Figma design system. */
const NAV_BG = "bg-[#0D1027]";

export default function Navbar() {
  return (
    <nav className={`sticky top-0 z-50 w-full text-white ${NAV_BG}`}>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-6 md:px-[18px] md:py-8">
        <Link
          href="/"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[10px] text-[#0D1027] md:size-12 md:text-xs"
        >
          Logo
        </Link>

        <ul className="hidden items-center gap-8 font-sans text-sm font-medium md:flex">
          <li>
            <Link href="/" className="hover:text-gray-300">
              Home
            </Link>
          </li>
          <li>
            {/* TODO: no dropdown behaviour yet — matches the design's collapsed state. */}
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 hover:text-gray-300"
            >
              Events
              <svg
                width="10"
                height="6"
                viewBox="0 0 10 6"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1 1L5 5L9 1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </li>
          <li>
            <Link href="/tugas" className="hover:text-gray-300">
              Task
            </Link>
          </li>
        </ul>

        {/* TODO: opens nothing yet — no mobile menu panel exists. */}
        <button
          type="button"
          aria-label="Open menu"
          className="cursor-pointer md:hidden"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Balances the logo so the link list stays optically centred. */}
        <div className="hidden size-12 md:block" />
      </div>
    </nav>
  );
}
