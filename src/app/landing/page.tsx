import React from "react";
import EventCard from "./_components/EventCard";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-white overflow-hidden text-[#5B538C]">
      {/* ========================================================= */}
      {/* LAYER 0: BACKGROUND & BUBBLES (Diubah posisinya agar presisi) */}
      {/* ========================================================= */}
      <div className="absolute inset-x-0 mx-auto w-full max-w-[1440px] h-full pointer-events-none z-0">
        {/* --- BACKGROUND EFEK UNGU UTAMA --- */}
        {/* REVISI: Menggunakan left-1/2 dan translate-x agar posisinya lebih ke tengah mengikut konten */}
        <div className="absolute top-[-800px] left-1/2 -translate-x-[55%] w-[1441px] h-[1455px] -rotate-[147deg] opacity-80 blur-[56px] bg-gradient-to-b from-[#962DFF] to-[#E0C2FF] rounded-[50%]" />

        {/* Bubble pendaran di bagian bawah web */}
        <div className="absolute bottom-[-200px] right-[-100px] w-[600px] h-[600px] bg-purple-300 rounded-[50%] blur-[100px] opacity-40" />

        {/* --- TEBAR BUBBLE SCATTER --- */}
        <div className="hidden md:block">
          {/* Ellipse 30 (Kiri Tengah - Besar) */}
          <div className="absolute top-[589px] left-[-327px] w-[469px] h-[474px] rotate-[118deg] opacity-75 rounded-[50%] bg-gradient-to-b from-[#962DFF] to-[#E0C2FF]" />

          {/* Ellipse 31 (Kiri Tengah - Kecil) */}
          <div className="absolute top-[919px] left-[-205px] w-[256px] h-[258px] rotate-[118deg] opacity-75 rounded-[50%] bg-gradient-to-b from-[#962DFF] to-[#E0C2FF]" />

          {/* Ellipse 32 (Kanan Bawah - Besar) */}
          {/* REVISI: Nilai top dikurangi ~300px agar bubble-nya ditarik naik ke atas */}
          <div className="absolute top-[1331px] right-[-205px] w-[469px] h-[474px] rotate-[-29.5deg] opacity-75 rounded-[50%] bg-gradient-to-b from-[#962DFF] to-[#E0C2FF]" />

          {/* Ellipse 33 (Kanan Bawah - Kecil) */}
          {/* REVISI: Nilai top dikurangi ~300px agar bubble-nya ditarik naik ke atas */}
          <div className="absolute top-[1297px] right-[-48px] w-[256px] h-[258px] rotate-[-29.5deg] opacity-75 rounded-[50%] bg-gradient-to-b from-[#962DFF] to-[#E0C2FF]" />
        </div>
      </div>

      {/* ========================================================= */}
      {/* LAYER 1: WADAH UTAMA KONTEN (w-full agar mentok di semua layar!) */}
      {/* ========================================================= */}
      <div className="w-full px-4 md:px-[18px] relative z-10">
        {/* 1. NAVBAR SECTION */}
        <nav className="flex items-center justify-between py-6 md:py-8 max-w-[1440px] mx-auto">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[10px] md:text-xs text-gray-400 shrink-0">
            Logo
          </div>
          <ul className="hidden md:flex items-center gap-8 text-sm font-medium">
            <li className="cursor-pointer hover:text-purple-700">Home</li>
            <li className="cursor-pointer hover:text-purple-700 flex items-center gap-1">
              Events
              <svg
                width="10"
                height="6"
                viewBox="0 0 10 6"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 1L5 5L9 1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </li>
            <li className="cursor-pointer hover:text-purple-700">Task</li>
          </ul>
          <div className="md:hidden">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </div>
          <div className="hidden md:block w-12 h-12"></div>
        </nav>

        {/* 2. HERO SECTION */}
        <section className="mt-8 md:mt-16 flex flex-col items-center text-center relative z-10">
          <h1 className="text-[#5D5A88] font-bold text-[36px] md:text-[56px] leading-[1.2] md:leading-[66px] max-w-[574px] mb-4 md:mb-6 px-2">
            AI FOR IMPACT 2026
          </h1>
          <p className="text-[#5D5A88] font-normal text-[14px] md:text-[18px] leading-relaxed md:leading-[30px] max-w-[574px] mb-8 md:mb-12 px-4">
            AI for Impact is an initiative that brings together students,
            researchers, and professionals to explore how artificial
            intelligence can solve environmental, social, and humanitarian
            challenges.
          </p>

          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-12 md:mb-16 w-full md:w-auto px-6">
            <button className="w-full md:w-auto justify-center px-8 py-3 md:py-4 bg-[#5B538C] hover:bg-[#4A4373] text-white rounded-full font-bold text-[14px] md:text-[16px] flex items-center gap-2 transition-all">
              Register Now
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
            <button className="w-full md:w-auto justify-center px-8 py-3 md:py-4 bg-[#5B538C] hover:bg-[#4A4373] text-white rounded-full font-bold text-[14px] md:text-[16px] flex items-center gap-2 transition-all">
              About Us
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
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 md:gap-10 w-full">
            {[
              { label: "Days", value: "00" },
              { label: "Hours", value: "00" },
              { label: "Mins", value: "00" },
              { label: "Secs", value: "00" },
            ].map((item, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-2 md:gap-4 w-[65px] md:w-[159px]"
              >
                <div className="w-full aspect-square md:h-[159px] bg-[#5B538C] rounded-[16px] md:rounded-[32px] flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-[28px] md:text-[56px] leading-tight md:leading-[66px]">
                    {item.value}
                  </span>
                </div>
                <span className="text-[#4A3AFF] font-bold text-[12px] md:text-[24px] leading-tight md:leading-[34px]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 3. EVENTS SECTION */}
        <section className="mt-24 md:mt-32 flex flex-col items-center w-full relative z-10">
          <h2 className="text-[#5D5A88] font-bold text-[40px] md:text-[56px] leading-tight md:leading-[66px] tracking-wide mb-10 md:mb-16">
            Events
          </h2>
          {/* Card Event akan berjarak rapi secara proporsional */}
          <div className="flex flex-col md:flex-row gap-12 md:gap-16 w-full justify-center items-center max-w-[1200px] mx-auto">
            <EventCard
              title="Workshop"
              description="Learn practical AI skills through interactive sessions guided by experienced mentors."
              buttonText="Daftar Workshop"
            />
            <EventCard
              title="Talkshow & Booth Karinov"
              description="Learn practical AI skills through interactive sessions guided by experienced mentors."
              buttonText="Tombol Talkshow"
            />
          </div>
        </section>

        {/* 4. ABOUT US SECTION */}
        <section className="mt-24 md:mt-32 flex flex-col items-center w-full relative z-10 pb-16 md:pb-24">
          <h2 className="text-[#5D5A88] font-bold text-[40px] md:text-[56px] leading-tight md:leading-[66px] tracking-wide mb-10 md:mb-12">
            About Us
          </h2>

          {/* Hapus max-w-[1404px] agar gambar BISA MENTOK 100% mengisi layar penuh (sisa 18px margin parent) */}
          <div className="relative w-full min-h-[500px] md:h-[853px] rounded-[18px] overflow-hidden flex flex-col px-6 md:px-16 pb-8 md:pb-16 shadow-2xl">
            <img
              src="/LEW02314.png"
              alt="Background STEI K"
              className="absolute inset-0 w-full h-full object-cover z-0"
            />
            <div className="absolute inset-x-0 top-0 h-[80%] md:h-[65%] bg-gradient-to-b from-[#5D5A88]/90 via-[#5D5A88]/60 to-transparent z-0" />

            <div className="relative z-10 flex flex-col items-center pt-[30px] md:pt-[40px] w-full max-w-[1077px] mx-auto text-center gap-[16px] md:gap-[24px]">
              <img
                src="/STEI K Revisi - ITO Blue.png"
                alt="Logo STEI K"
                className="w-[180px] md:w-[320px] h-auto object-contain drop-shadow-lg"
              />
              <p className="text-[#FFFFFF] font-normal text-[12px] md:text-[18px] leading-relaxed md:leading-[30px] drop-shadow-md">
                Mauris ac rutrum libero. Morbi sed arcu ut lorem ullamcorper
                suscipit. Cras lobortis vel justo malesuada luctus. Aliquam
                accumsan purus vitae quam fringilla congue. Mauris suscipit
                magna quis nulla consectetur congue. Duis vulputate felis nulla,
                vitae dignissim tortor tincidunt eget. Nullam vestibulum sed mi
                a mollis. Curabitur in velit lobortis, iaculis mi a, hendrerit
                ex. Interdum et malesuada fames ac ante ipsum primis in
                faucibus.
              </p>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center md:items-end w-full mt-12 md:mt-auto gap-6 md:gap-0">
              <div className="text-[#FFFFFF] font-bold text-[14px] md:text-[24px] leading-tight md:leading-[34px] drop-shadow-md text-center">
                Contact Person: +62 812 3456 7890
              </div>

              <div className="flex flex-wrap justify-center items-center gap-4 md:gap-[24px] text-[#FFFFFF] font-bold text-[14px] md:text-[24px] leading-tight md:leading-[34px] drop-shadow-md">
                <div className="flex items-center gap-1 md:gap-2 cursor-pointer hover:text-gray-300">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                  <span>@steik25itb</span>
                </div>
                <div className="flex items-center gap-1 md:gap-2 cursor-pointer hover:text-gray-300">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="2"
                      y="2"
                      width="20"
                      height="20"
                      rx="5"
                      ry="5"
                    ></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                  <span>@steik25itb</span>
                </div>
                <div className="flex items-center gap-1 md:gap-2 cursor-pointer hover:text-gray-300">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>@steikitb25</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
