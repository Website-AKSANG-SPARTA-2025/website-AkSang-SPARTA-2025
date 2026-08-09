import Image from "next/image";

const SOCIALS = [
  {
    label: "TikTok",
    handle: "@steik25itb",
    href: "https://www.tiktok.com/@steik25itb",
    icon: (
      <path d="M16.6 5.82a4.28 4.28 0 01-3.16-1.42V13.3a4.9 4.9 0 11-4.2-4.85v2.1a2.8 2.8 0 102 2.68V2h2.05a4.28 4.28 0 004.28 3.9v2.06a6.3 6.3 0 01-.97-.14z" />
    ),
  },
  {
    label: "Instagram",
    handle: "@steikitb25",
    href: "https://www.instagram.com/steikitb25/",
    icon: (
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2c2.72 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.21.6 1.76 1.15.5.5.9 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43-.26.66-.6 1.21-1.15 1.76-.5.5-1.1.9-1.76 1.15-.64.25-1.37.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.92 4.92 0 01-1.76-1.15 4.92 4.92 0 01-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.21 1.15-1.76.5-.5 1.1-.9 1.76-1.15.64-.25 1.37-.42 2.43-.47C8.94 2.01 9.28 2 12 2zm0 5a5 5 0 100 10 5 5 0 000-10zm0 8.2a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm5.2-8.4a1.17 1.17 0 100-2.34 1.17 1.17 0 000 2.34z"
      />
    ),
  },
  {
    label: "X",
    handle: "@steikitb25",
    href: "https://x.com/steikitb25",
    icon: (
      <path d="M18.9 3H21.7l-6.06 6.93L22.8 21h-5.6l-4.38-5.73L7.8 21H5l6.48-7.41L4.4 3h5.74l3.96 5.24L18.9 3zm-.98 16.2h1.53L7.16 4.72H5.52L17.92 19.2z" />
    ),
  },
];

const PLACEHOLDER_ICON = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.2}
    className="h-10 w-10 text-[#4C4B82]/40"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="M21 16l-5.5-5.5a2 2 0 00-2.8 0L4 19" />
  </svg>
);

function Tile({ heightClass }: { heightClass: string }) {
  return (
    <div
      className={`flex w-full shrink-0 items-center justify-center rounded-2xl border border-[#3B3A70]/15 bg-white/40 shadow-sm ${heightClass}`}
    >
      {PLACEHOLDER_ICON}
    </div>
  );
}

const COLUMNS: string[][] = [
  ["h-64", "h-80", "h-72", "h-96"], // nanti tambahin foto-foto galerinya di sini
  ["h-80", "h-64", "h-96", "h-72"],
  ["h-72", "h-96", "h-64", "h-80"],
  ["h-96", "h-72", "h-80", "h-64"],
];

export default function AboutGallery() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-gradient-to-b from-[#EEF0F8] via-[#DCE0F0] to-[#7373A8]">
      {/* Keyframe animasi */}
      <style>{`
        @keyframes about-gallery-scroll {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
      `}</style>

      {/* Grid Foto Full Width */}
      <div className="grid h-full w-full grid-cols-2 gap-4 p-4 sm:grid-cols-4 sm:gap-6">
        {COLUMNS.map((heights, colIndex) => {
          const reverse = colIndex % 2 === 1;
          const columnStyle = {
            "--duration": `${22 + colIndex * 4}s`,
            "--direction": reverse ? "reverse" : "normal",
          } as React.CSSProperties;

          return (
            <div key={colIndex} className="h-full overflow-hidden">
              <div
                className="flex flex-col gap-4 sm:gap-6 [animation:about-gallery-scroll_var(--duration)_linear_infinite] [animation-direction:var(--direction)] hover:[animation-play-state:paused]"
                style={columnStyle}
              >
                {[...heights, ...heights].map((h, i) => (
                  <Tile key={i} heightClass={h} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overlay Soft Gradient dari Atas ke Bawah */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/30 via-white/10 to-[#58578E]/40" />

      {/* Konten Tengah: Logo, Deskripsi, CP & Sosmed (Warna Teks Indigo Gelap) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
        <div className="pointer-events-auto flex max-w-2xl flex-col items-center gap-6 text-center text-[#2A295C]">
          {/* Logo STEI */}
          <div className="relative h-28 w-56 sm:h-36 sm:w-72">
            <Image
              src="/images/logo-steik25.png"
              alt="Logo STEI-K'25"
              fill
              className="object-contain"
            />
          </div>

          {/* Teks Deskripsi */}
          <p className="text-balance text-xs leading-relaxed text-[#35336B] sm:text-sm md:text-base font-normal">
            Mauris ac rutrum libero. Morbi sed arcu ut lorem ullamcorper suscipit. 
            Cras lobortis vel justo malesuada luctus. Aliquam accumsan purus vitae quam fringilla congue. 
            Mauris suscipit magna quis nulla consectetur congue. Duis vulputate felis nulla, vitae dignissim tortor tincidunt eget. 
            Nullam vestibulum sed mi a mollis. Curabitur in velit lobortis, iaculis mi a, hendrerit ex. Interdum et malesuada fames ac ante ipsum primis in faucibus.
          </p>

          {/* Contact Person & Sosmed */}
          <div className="flex flex-col items-center gap-3 text-xs sm:text-sm text-[#2A295C]">
            <p className="font-bold">
              Contact Person: <span className="font-semibold">+62 812 3456 7890</span>
            </p>
            <ul className="flex items-center gap-4 sm:gap-6 font-semibold">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 hover:text-[#1D1C43] transition"
                  >
                    <svg
                      className="h-4 w-4 fill-current"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      {social.icon}
                    </svg>
                    <span>{social.handle}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}