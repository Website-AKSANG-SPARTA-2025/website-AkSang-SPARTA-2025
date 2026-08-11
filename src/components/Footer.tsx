import React from "react";
import Image from "next/image";
import Link from "next/link";

import { InstagramIcon, TikTokIcon, XIcon } from "@/components/SocialIcons";
import { cn } from "@/lib/cn";

const SOCIALS = [
  {
    Icon: TikTokIcon,
    handle: "steik25itb",
    href: "https://tiktok.com/@steik25itb",
  },
  {
    Icon: InstagramIcon,
    handle: "steik25itb",
    href: "https://instagram.com/steik25itb",
  },
  { Icon: XIcon, handle: "steikitb25", href: "https://x.com/steikitb25" },
] as const;

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Workshop", href: "/workshop" },
  { label: "Presensi", href: "/presensi" },
] as const;

function LogoBadge({ className }: { className?: string }) {
  return (
    <Image
      src="/logo_kegiatan.png"
      alt="Aegis"
      width={206}
      height={68}
      className={cn("h-auto shrink-0 object-contain", className)}
    />
  );
}

function SocialRow({ className }: { className?: string }) {
  return (
    <ul className={cn("flex items-center", className)}>
      {SOCIALS.map(({ Icon, handle, href }) => (
        <li key={href}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-white/90 transition-opacity hover:opacity-70"
          >
            <Icon className="size-[1em]" />
            <span>{handle}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

// mt-* on the <footer> separates it from page content. That gap used to come
// from the background's alpha fade; now that the asset is a hard-edged opaque
// rectangle it has to be explicit. Applies to every page.
export default function Footer() {
  return (
    <footer className="relative isolate mt-16 w-full overflow-hidden bg-[#1a0f33] text-white md:mt-24">
      {/*
        Solid background rectangle, identical at every breakpoint. The asset was
        cropped past its alpha fade and flattened onto #0D1027, so it is fully
        opaque — nothing behind the footer can show through, and the top edge is
        a clean horizontal line. bg colour above is a fallback for the sliver
        before the image loads.
      */}
      <Image
        src="/Footer_Background.png"
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        className="-z-10 object-cover object-center"
      />

      {/* ---------------- Mobile: centred stack, no nav links ---------------- */}
      <div className="flex flex-col items-center gap-3 px-6 py-8 text-center md:hidden">
        <LogoBadge className="w-[120px]" />

        <h2 className="font-heading text-2xl font-bold tracking-heading">
          AI FOR IMPACT 2026
        </h2>

        <SocialRow className="flex-wrap justify-center gap-x-4 gap-y-1 font-sans text-sm font-bold tracking-body" />

        <p className="font-sans text-xs tracking-body text-white/80">
          Bandung, West Java, Indonesia
        </p>
      </div>

      {/* ---------------- Desktop: split row with nav grid ---------------- */}
      <div className="mx-auto hidden max-w-7xl items-center justify-between gap-10 px-10 py-10 md:flex">
        <div className="flex items-center gap-6">
          <LogoBadge className="w-[170px]" />

          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-3xl font-bold tracking-heading lg:text-4xl">
              AI FOR IMPACT 2026
            </h2>

            <p className="font-sans text-sm tracking-body text-white/85">
              Bandung, West Java, Indonesia
            </p>

            <SocialRow className="gap-x-4 font-sans text-xs tracking-body" />
          </div>
        </div>

        <nav aria-label="Footer">
          <ul className="grid grid-cols-1 gap-y-5 font-sans text-sm tracking-body">
            {LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="transition-opacity hover:opacity-70"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
