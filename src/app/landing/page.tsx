import React from "react";
import EventCard from "./_components/EventCard";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-[#0D1027] overflow-hidden text-white font-sans">
      {/* ========================================================= */}
      {/* LAYER 0: BACKGROUND UTAMA (PALING BELAKANG) */}
      {/* ========================================================= */}
      <img
        src="/Galaxy_background.png"
        alt="Aegis Galaxy Background"
        className="absolute top-0 left-0 w-full h-full object-cover z-0 pointer-events-none"
      />
      <div className="absolute top-0 left-0 w-full h-full bg-[#0D1027]/60 z-0 pointer-events-none" />

      {/* ========================================================= */}
      {/* LAYER PLANET (z-0, DI BELAKANG KONTEN) */}
      {/* ========================================================= */}
      {/* Wadah ini dijamin persis di tengah layar (flex justify-center) */}
      <div className="absolute inset-x-0 top-0 w-full flex justify-center pointer-events-none z-0 hidden md:block">
        {/* Kanvas 1440px sebagai patokan koordinat mutlak */}
        <div className="relative w-full max-w-[1440px] h-[3000px]">
          {/* Planet 1 - Digeser lebih ke kanan agar tidak over ke tengah */}
          <img
            src="/planet1.png"
            alt="Planet Aegis 1"
            className="absolute top-[-294px] right-[-250px] w-[696px] h-auto object-contain max-w-none"
          />

          {/* Planet 2 - Tarik naik drastis ke celah Countdown & Events */}
          <img
            src="/planet2.png"
            alt="Planet Aegis 2"
            className="absolute top-[450px] left-[-450px] w-[853px] h-auto object-contain max-w-none"
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* LAYER DEKORASI DEPAN (z-20, MENUMPUK DI ATAS FOTO ABOUT US) */}
      {/* ========================================================= */}
      <div className="absolute inset-x-0 top-0 w-full flex justify-center pointer-events-none z-20 hidden md:block">
        <div className="relative w-full max-w-[1440px] h-[3000px]">
          {/* Galaxy 1 - Digeser drastis ke kiri (left-[-250px]) menembus luar web */}
          <img
            src="/galaxy1.png"
            alt="Galaxy Decoration"
            className="absolute top-[2100px] left-[-250px] w-[427px] h-auto object-contain max-w-none drop-shadow-2xl"
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* LAYER 1: WADAH UTAMA KONTEN (z-10) */}
      {/* ========================================================= */}
      <div className="w-full px-4 md:px-[18px] relative z-10">
        {/* Konten Navbar, Hero, dkk mulai dari sini... */}
        {/* 1. NAVBAR SECTION */}
        <nav className="flex items-center justify-between py-6 md:py-8 max-w-[1440px] mx-auto">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[10px] md:text-xs text-[#0D1027] shrink-0">
            Logo
          </div>
          <ul className="hidden md:flex items-center gap-8 text-sm font-medium">
            <li className="cursor-pointer hover:text-gray-300">Home</li>
            <li className="cursor-pointer hover:text-gray-300 flex items-center gap-1">
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
            <li className="cursor-pointer hover:text-gray-300">Task</li>
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

        {/* 2. HERO SECTION - AEGIS THEME */}
        <section className="mt-8 md:mt-16 flex flex-col md:flex-row items-center justify-center gap-10 md:gap-16 relative z-10 max-w-[1100px] mx-auto px-4 md:px-8">
          <div className="w-[180px] md:w-[250px] shrink-0 flex justify-center">
            <div className="w-full aspect-[3/4] bg-white/10 rounded-[32px] flex items-center justify-center text-white/50 border-2 border-dashed border-white/20">
              Robot Image
            </div>
          </div>

          <div className="flex flex-col items-center md:items-start text-center md:text-left w-full max-w-[679px]">
            <h1
              className="text-white font-bold text-[56px] md:text-[72px] leading-tight md:leading-[35px] mb-6 md:mb-8"
              style={{ fontFamily: "var(--font-science-gothic)" }}
            >
              aegis
            </h1>
            <p
              className="text-white font-normal text-[14px] md:text-[18px] leading-relaxed md:leading-[30px] mb-8 md:mb-10 max-w-[574px]"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              AI for Impact is an initiative that brings together students,
              researchers, and professionals to explore how artificial
              intelligence can solve environmental, social, and humanitarian
              challenges.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-[16px] w-full sm:w-auto">
              <button className="flex items-center justify-center gap-[7px] w-[192.5px] h-[66px] rounded-[35.2px] bg-gradient-to-b from-[#9BDAFF] to-[#FFFFFF] text-[#0D1027] transition-all hover:scale-105 shadow-lg">
                <span
                  className="font-bold text-[16px] leading-[18px] tracking-[0.1em] uppercase"
                  style={{ fontFamily: "var(--font-science-gothic)" }}
                >
                  Register Now
                </span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <button className="flex items-center justify-center gap-[7px] w-[192.5px] h-[66px] rounded-[35.2px] bg-gradient-to-b from-[#9BDAFF] to-[#FFFFFF] text-[#0D1027] transition-all hover:scale-105 shadow-lg">
                <span
                  className="font-bold text-[16px] leading-[18px] tracking-[0.1em] uppercase"
                  style={{ fontFamily: "var(--font-science-gothic)" }}
                >
                  About Us
                </span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* KOTAK COUNTDOWN TIMER (HANYA VERSI AEGIS YANG TERSISA) */}
        {/* ========================================================= */}
        <section className="flex items-center justify-center gap-4 md:gap-[32px] w-full mt-24 relative z-10 px-4">
          {[
            { label: "Days", value: "00" },
            { label: "Hours", value: "00" },
            { label: "Minutes", value: "00" },
            { label: "Seconds", value: "00" },
          ].map((item, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-[12px] md:gap-[20px] w-auto md:w-[159px]"
            >
              {/* Box Gradient Light Blue Aegis */}
              <div className="w-[70px] h-[75px] md:w-[159px] md:h-[170px] rounded-[12px] md:rounded-[24px] flex items-center justify-center border border-[#FFFFFF] bg-gradient-to-b from-[#9BDBFF] to-[#D8F1FF] shadow-lg">
                <span
                  className="text-[#0D1027] font-bold text-[20px] md:text-[36px] leading-tight md:leading-[46px]"
                  style={{ fontFamily: "var(--font-science-gothic)" }}
                >
                  {item.value}
                </span>
              </div>

              {/* Teks Label Bawah */}
              <span
                className="text-[#FFFFFF] font-bold text-[12px] md:text-[24px] leading-tight md:leading-[34px] tracking-wide"
                style={{ fontFamily: "var(--font-science-gothic)" }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </section>

        {/* 3. EVENTS SECTION - AEGIS THEME */}
        <section className="mt-24 md:mt-32 flex flex-col items-center w-full relative z-10">
          <h2
            className="text-[#FFFFFF] font-bold text-[40px] md:text-[50px] leading-tight md:leading-[30px] tracking-wide mb-10 md:mb-16 uppercase drop-shadow-lg"
            style={{ fontFamily: "var(--font-science-gothic)" }}
          >
            Events
          </h2>
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 w-full justify-center items-center max-w-[1200px] mx-auto px-4">
            <EventCard
              title="Workshop"
              description="Learn practical AI skills through interactive sessions guided by experienced mentors."
              buttonText="Daftar Workshop"
            />
            {/* Ubah title dan buttonText sesuai screenshot Figma terbaru */}
            <EventCard
              title="Form Presensi"
              description="Learn practical AI skills through interactive sessions guided by experienced mentors."
              buttonText="Presensi"
            />
          </div>
        </section>

        {/* 4. ABOUT US SECTION - AEGIS THEME */}
        <section className="mt-24 md:mt-32 flex flex-col items-center w-full relative z-10 pb-16 md:pb-24">
          {/* Hapus class uppercase agar kembali jadi Title Case (About Us) */}
          <h2
            className="text-[#FFFFFF] font-bold text-[40px] md:text-[50px] leading-tight md:leading-[30px] tracking-wide mb-10 md:mb-12 capitalize drop-shadow-lg"
            style={{ fontFamily: "var(--font-science-gothic)" }}
          >
            About Us
          </h2>

          <div
            className="relative w-full min-h-[500px] md:h-[853px] flex flex-col px-6 md:px-16 pb-8 md:pb-16 shadow-2xl bg-[#0D1027]"
            style={{
              clipPath:
                "polygon(0 0, 100% 0, 100% 35%, calc(100% - 32px) 40%, calc(100% - 32px) 60%, 100% 65%, 100% 100%, 0 100%, 0 65%, 32px 60%, 32px 40%, 0 35%)",
            }}
          >
            <img
              src="/LEW02314.png"
              alt="Background STEI K"
              className="absolute inset-0 w-full h-full object-cover z-0"
            />

            <div className="absolute inset-x-0 top-0 h-[65%] bg-gradient-to-b from-[#5D5A88]/90 via-[#5D5A88]/60 to-transparent z-0" />

            {/* KONTEN ATAS: pt dikurangi jadi 20px, gap dikurangi jadi 12px agar lebih rapat */}
            <div className="relative z-10 flex flex-col items-center pt-[16px] md:pt-[20px] w-full max-w-[1077px] mx-auto text-center gap-[12px]">
              <img
                src="/STEI K Revisi - ITO Blue.png"
                alt="Logo STEI K"
                className="w-[180px] md:w-[320px] h-auto object-contain drop-shadow-lg"
              />

              {/* mt-4 dihapus dari sini agar jaraknya tidak dobel */}
              <p
                className="text-[#FFFFFF] font-normal text-[12px] md:text-[18px] leading-relaxed md:leading-[30px] drop-shadow-md"
                style={{ fontFamily: "var(--font-jetbrains-mono)" }}
              >
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
              <div
                className="text-[#FFFFFF] font-bold text-[14px] md:text-[18px] leading-tight md:leading-[24px] drop-shadow-md text-center"
                style={{ fontFamily: "var(--font-science-gothic)" }}
              >
                Contact Person: +62 812 3456 7890
              </div>

              <div className="flex flex-wrap justify-center items-center gap-4 md:gap-[24px] text-[#FFFFFF] font-bold text-[14px] md:text-[18px] leading-tight md:leading-[24px] drop-shadow-md">
                <div className="flex items-center gap-1 md:gap-2 cursor-pointer hover:text-[#9BDBFF] transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                  <span style={{ fontFamily: "var(--font-science-gothic)" }}>
                    steik25itb
                  </span>
                </div>

                <div className="flex items-center gap-1 md:gap-2 cursor-pointer hover:text-[#9BDBFF] transition-colors">
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
                  <span style={{ fontFamily: "var(--font-science-gothic)" }}>
                    steik25itb
                  </span>
                </div>

                <div className="flex items-center gap-1 md:gap-2 cursor-pointer hover:text-[#9BDBFF] transition-colors">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span style={{ fontFamily: "var(--font-science-gothic)" }}>
                    steikitb25
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
