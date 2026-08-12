import React from "react";
import Image from "next/image";
import Link from "next/link";

interface EventCardProps {
  title: string;
  description: string;
  buttonText: string;
  iconSrc: string;
  /** Where the card's button goes, e.g. /workshop */
  href: string;
}

export default function EventCard({
  title,
  description,
  buttonText,
  iconSrc,
  href,
}: EventCardProps) {
  return (
    <div className="flex flex-col items-center w-full max-w-[472px] drop-shadow-2xl">
      <div
        className="w-full h-[460px] rounded-[32px] px-8 py-12 flex flex-col items-center justify-center text-center relative bg-gradient-to-b from-[#9BDBFF] to-[#4A90E2] border border-white/60"
        style={{
          clipPath:
            "polygon(0 0, 100% 0, 100% 30%, 96% 35%, 96% 65%, 100% 70%, 100% 100%, 0 100%, 0 70%, 4% 65%, 4% 35%, 0 30%)",
        }}
      >
        <div className="relative w-[140px] h-[140px] flex justify-center items-center mb-6">
          <Image
            src={iconSrc}
            alt=""
            aria-hidden="true"
            width={391}
            height={367}
            className="w-full h-auto object-contain drop-shadow-lg"
          />
        </div>

        <h3
          className="font-bold text-[#F9F9FF] text-[28px] md:text-[36px] leading-[46px] mb-4 mt-2 drop-shadow-md capitalize"
          style={{ fontFamily: "var(--font-science-gothic)" }}
        >
          {title}
        </h3>

        <p
          className="font-normal text-[#F9F9FF] text-[14px] md:text-[18px] leading-[26px] md:leading-[30px] max-w-[344px] drop-shadow-sm"
          style={{ fontFamily: "var(--font-jetbrains-mono)" }}
        >
          {description}
        </p>
      </div>

      <Link
        href={href}
        className="mt-8 px-[36px] py-[24px] h-[70px] bg-gradient-to-b from-[#9BDBFF] to-[#FFFFFF] hover:scale-105 rounded-[40px] flex items-center justify-center gap-[8px] transition-all shadow-[0_4px_20px_rgba(155,218,255,0.4)] relative z-10"
      >
        <span
          className="text-[#0D1027] font-bold text-[16px] leading-[22px]"
          style={{ fontFamily: "var(--font-science-gothic)" }}
        >
          {buttonText}
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0D1027"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
