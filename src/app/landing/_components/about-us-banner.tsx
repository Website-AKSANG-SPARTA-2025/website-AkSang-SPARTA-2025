import Image from "next/image";
import localFont from "next/font/local";
import type { SVGProps } from "react";

const scienceGothic = localFont({
  src: "../../fonts/ScienceGothic.ttf",
  variable: "--font-science-gothic",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "../../fonts/JetBrainsMono-Regular.ttf",
  weight: "400",
  variable: "--font-jetbrains-mono",
  display: "swap",
});

function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84q-.02 7.92-8.05 7.92-8.05 0-8.05-7.92 0-7.92 8.05-7.92.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const heading = "-tracking-[0.05em]";
const jetbrainsTracking = "-tracking-[0.1em]";

export default function AboutUsBanner() {
  return (
    <section
      className={`${scienceGothic.variable} ${jetbrainsMono.variable} relative w-full overflow-hidden bg-[#0D1027]`}
    >
      {/* Nebula / stars background */}
      <Image
        src="/images/galaxy-background.png"
        alt=""
        fill
        priority
        aria-hidden
        className="pointer-events-none object-cover object-bottom"
      />

      {/* Robot mascot, peeking from top-right corner */}
      <Image
        src="/images/robot-manja.png"
        alt=""
        width={494}
        height={678}
        priority
        aria-hidden
        className="pointer-events-none absolute top-[-20px] right-[-30px] z-20 h-auto w-[25vw] rotate-[-18.15deg] select-none sm:-top-[150px] sm:right-[-30px] sm:w-40 md:-top-[100px] md:right-[-30px] md:w-48 lg:-top-[250px] lg:right-[-80px] lg:w-80"
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Title */}
        <h2
          className={`${scienceGothic.className} ${heading} py-6 text-center text-3xl font-bold text-white sm:py-10 sm:text-5xl`}
        >
          About Us
        </h2>

        {/* Photo card */}
        <div className="w-full px-2 pb-2 sm:px-3 sm:pb-3">
          <div className="relative flex min-h-[calc(100dvh-87px)] w-full flex-col overflow-hidden rounded-2xl shadow-2xl sm:aspect-[632/382] sm:min-h-0 sm:rounded-3xl">
            <Image
              src="/images/about-hero.jpg"
              alt="Keluarga besar STEI-K'25 berfoto bersama"
              fill
              priority
              className="object-cover"
            />
            {/* Light overlay for text legibility */}
            <div className="absolute inset-0 bg-white/10" aria-hidden />

            {/* Logo + description */}
            <div className="relative z-10 flex flex-1 flex-col items-center px-[9%] pt-8 sm:pt-[4%]">
              <Image
                src="/images/logo-steik25.png"
                alt="Logo STEI-K'25"
                width={571}
                height={184}
                className="h-auto w-44 sm:w-[18%] sm:min-w-[160px]"
              />
              <p
                className={`${jetbrainsMono.className} ${jetbrainsTracking} mt-4 max-w-none text-center leading-relaxed text-black sm:mt-[1.5%]`}
                style={{ fontSize: "clamp(11px, 1.55vw, 24px)" }}
              >
                Mauris ac rutrum libero. Morbi sed arcu ut lorem ullamcorper
                suscipit. Cras lobortis vel justo malesuada luctus. Aliquam
                accunsan purus vitae quam fringilla congue. Mauris suscipit
                magna quis nulla consectetur congue. Duis vulputate felis
                nulla, vitae dignissim tortor tincidunt eget. Nullam
                vestibulum sed mi a mollis. Curabitur in velit lobortis,
                iaculis mi a, hendrerit ex. Interdum et malesuada fames ac
                ante ipsum primis in faucibus.
              </p>
            </div>

            {/* Contact + socials */}
            <div className="relative z-10 mt-auto flex flex-wrap items-center justify-between gap-3 px-[9%] pb-5 sm:pb-[3%]">
              <p
                className={`${scienceGothic.className} ${heading} text-sm font-bold text-white sm:text-lg`}
              >
                Contact Person: +62 812 3456 7890
              </p>

              <div className="flex items-center gap-4 sm:gap-5">
                <a
                  href="https://www.tiktok.com/@steik25itb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-white"
                >
                  <TikTokIcon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  <span
                    className={`${scienceGothic.className} ${heading} text-sm font-bold sm:text-lg`}
                  >
                    steik25itb
                  </span>
                </a>

                <a
                  href="https://www.instagram.com/steik25itb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-white"
                >
                  <InstagramIcon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  <span
                    className={`${scienceGothic.className} ${heading} text-sm font-bold sm:text-lg`}
                  >
                    steik25itb
                  </span>
                </a>

                <a
                  href="https://x.com/steikitb25"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-white"
                >
                  <XIcon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  <span
                    className={`${scienceGothic.className} ${heading} text-sm font-bold sm:text-lg`}
                  >
                    steikitb25
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
