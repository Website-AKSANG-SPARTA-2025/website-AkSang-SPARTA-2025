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

const NAVBAR_HEIGHT = "73px";

export default function AboutHero() {
  return (
    <section className="w-full bg-[#B9B9C8] p-0 sm:p-1 flex justify-center">
      <div
        className="relative w-full min-h-[600px] rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between p-6 sm:p-10"
        style={{ height: `calc(100dvh - ${NAVBAR_HEIGHT})` }}
      >
        {/* Foto background */}
        <Image
          src="/images/about-hero.jpg"
          alt="Dokumentasi kegiatan STEI-K'25"
          fill
          priority
          sizes="(min-width: 1024px) 1024px, 100vw"
          className="object-cover object-center"
        />

        {/* Overlay tipis */}
        <div className="absolute inset-0 bg-indigo-950/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

        {/* Konten atas & tengah: logo + deskripsi */}
        <div className="relative z-10 flex flex-col items-center text-center gap-4 mt-2 sm:mt-6">
          <div className="relative w-56 h-32 sm:w-72 sm:h-40 md:w-80 md:h-44">
            <Image
              src="/images/logo-steik25.png"
              alt="Logo STEI-K'25"
              fill
              priority
              className="object-contain"
            />
          </div>

          <p className="text-white/95 text-sm sm:text-base leading-relaxed max-w-4xl [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">
            Mauris ac rutrum libero. Morbi sed arcu ut lorem ullamcorper suscipit. 
            Cras lobortis vel justo malesuada luctus. Aliquam accumsan purus vitae quam fringilla congue. 
            Mauris suscipit magna quis nulla consectetur congue. Duis vulputate felis nulla, vitae dignissim tortor tincidunt eget. 
            Nullam vestibulum sed mi a mollis. Curabitur in velit lobortis, iaculis mi a, hendrerit ex. 
            Interdum et malesuada fames ac ante ipsum primis in faucibus.
          </p>
        </div>

        {/* Konten bawah: contact person + social media */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-white text-sm sm:text-base font-semibold [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">
          <p>
            Contact Person: <span className="font-semibold">+62 812 3456 7890</span>
          </p>
          <ul className="flex items-center gap-5">
            {SOCIALS.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 font-semibold text-sm sm:text-base hover:text-white/70 transition"
                >
                  <svg
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
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
    </section>
  );
}