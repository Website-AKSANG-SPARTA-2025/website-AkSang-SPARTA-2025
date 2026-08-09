import React from "react";

interface EventCardProps {
  title: string;
  description: string;
  buttonText: string;
}

export default function EventCard({
  title,
  description,
  buttonText,
}: EventCardProps) {
  return (
    <div className="flex flex-col items-center w-full max-w-[440px] drop-shadow-2xl">
      {/* KOTAK UTAMA: Memadukan rounded-[32px] dan clip-path untuk lekukan samping */}
      <div
        className="bg-[#5B538C] w-full rounded-[32px] px-8 py-10 flex flex-col items-center text-center relative"
        style={{
          clipPath:
            "polygon(0 0, 100% 0, 100% 30%, 96% 35%, 96% 65%, 100% 70%, 100% 100%, 0 100%, 0 70%, 4% 65%, 4% 35%, 0 30%)",
        }}
      >
        {/* WADAH BUBBLE */}
        <div className="relative w-full h-[180px] flex justify-center mb-2">
          {/* Bubble Besar (Posisi simetris di tengah) */}
          <div className="absolute top-[35px] left-1/2 -translate-x-1/2 w-[144px] h-[144px] rounded-full opacity-90 bg-gradient-to-b from-[#E6C2FF] to-[#962DFF]" />

          {/* Bubble Kecil (Tepat lurus di atas bubble besar, simetris di tengah) */}
          <div className="absolute top-[0px] left-1/2 -translate-x-1/2 w-[78px] h-[78px] rounded-full opacity-95 shadow-sm bg-gradient-to-b from-[#E6C2FF] to-[#962DFF]" />
        </div>

        {/* TYPOGRAPHY */}
        <h3 className="font-bold text-[#F9F9FF] text-[36px] leading-[46px] mb-4 mt-2">
          {title}
        </h3>
        <p className="font-normal text-[#F9F9FF] text-[18px] leading-[30px] max-w-[344px]">
          {description}
        </p>
      </div>

      {/* Tombol CTA di bawah Card */}
      <button className="mt-8 px-10 py-4 bg-[#5B538C] hover:bg-[#4A4373] text-[#F9F9FF] rounded-full font-bold text-[16px] flex items-center gap-2 transition-all shadow-md">
        {buttonText}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
