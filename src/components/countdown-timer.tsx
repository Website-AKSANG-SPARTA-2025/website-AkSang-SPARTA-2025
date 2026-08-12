"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/cn";

export interface CountdownTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
  className?: string;
}

export default function CountdownTimer({
  initialSeconds,
  onComplete,
  className,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const clampedTimeLeft = Math.max(timeLeft, 0);

  useEffect(() => {
    // Stop the timer when it reaches zero
    if (timeLeft <= 0) {
      if (onComplete) {
        onComplete();
      }
      return;
    }

    // Set up the interval to decrease the time every 1000ms (1 second)
    const timerId = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    // Cleanup the interval when the component unmounts or time changes
    return () => clearInterval(timerId);
  }, [timeLeft, onComplete]);

  const formatSeconds = (seconds: number) => {
    const second = seconds % 60;

    // Add leading zeros if needed (e.g., 9 becomes "09")
    const paddedSeconds = String(second).padStart(2, "0");

    return `${paddedSeconds}`;
  };

  const formatMinutes = (seconds: number) => {
    const minutes = Math.floor((seconds % 3600) / 60);

    // Add leading zeros if needed (e.g., 9 becomes "09")
    const paddedMinutes = String(minutes).padStart(2, "0");

    return `${paddedMinutes}`;
  };

  const formatHours = (seconds: number) => {
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);

    // Add leading zeros if needed (e.g., 9 becomes "09")
    const paddedHours = String(hours).padStart(2, "0");

    return `${paddedHours}`;
  };

  const formatDays = (seconds: number) => {
    const days = Math.floor(seconds / 3600 / 24);

    // Add leading zeros if needed (e.g., 9 becomes "09")
    const paddedDays = String(days).padStart(2, "0");

    return `${paddedDays}`;
  };
  return (
    <div className="flex h-[221px] w-[840px] gap-[68px]">
      <div className="flex h-[221px] w-[159px] flex-col gap-[17px]">
        <div
          className={cn(
            "h-[170px] w-[159px] rounded-[24px] border border-[#FFFFFF] bg-gradient-to-r from-[#9BDBFF] to-[#D8F1FF]",
            "inline-flex items-center justify-center text-center font-['Science_Gothic'] text-[36px] font-bold leading-[46px] tracking-[0px] text-[#0D1027]",
            className,
          )}
        >
          {formatDays(clampedTimeLeft)}
        </div>
        <div className="h-[34px] w-[159px] text-center font-['Science_Gothic'] text-[24px] font-bold leading-[34px] tracking-[0px] text-[#FFFFFF]">
          Days
        </div>
      </div>
      <div className="flex h-[221px] w-[159px] flex-col gap-[17px]">
        <div
          className={cn(
            "h-[170px] w-[159px] rounded-[24px] border border-[#FFFFFF] bg-gradient-to-r from-[#9BDBFF] to-[#D8F1FF]",
            "inline-flex items-center justify-center text-center font-['Science_Gothic'] text-[36px] font-bold leading-[46px] tracking-[0px] text-[#0D1027]",
            className,
          )}
        >
          {formatHours(clampedTimeLeft)}
        </div>
        <div className="h-[34px] w-[159px] text-center font-['Science_Gothic'] text-[24px] font-bold leading-[34px] tracking-[0px] text-[#FFFFFF]">
          Hours
        </div>
      </div>
      <div className="flex h-[221px] w-[159px] flex-col gap-[17px]">
        <div
          className={cn(
            "h-[170px] w-[159px] rounded-[24px] border border-[#FFFFFF] bg-gradient-to-r from-[#9BDBFF] to-[#D8F1FF]",
            "inline-flex items-center justify-center text-center font-['Science_Gothic'] text-[36px] font-bold leading-[46px] tracking-[0px] text-[#0D1027]",
            className,
          )}
        >
          {formatMinutes(clampedTimeLeft)}
        </div>
        <div className="h-[34px] w-[159px] text-center font-['Science_Gothic'] text-[24px] font-bold leading-[34px] tracking-[0px] text-[#FFFFFF]">
          Minutes
        </div>
      </div>
      <div className="flex h-[221px] w-[159px] flex-col gap-[17px]">
        <div
          className={cn(
            "h-[170px] w-[159px] rounded-[24px] border border-[#FFFFFF] bg-gradient-to-r from-[#9BDBFF] to-[#D8F1FF]",
            "inline-flex items-center justify-center text-center font-['Science_Gothic'] text-[36px] font-bold leading-[46px] tracking-[0px] text-[#0D1027]",
            className,
          )}
        >
          {formatSeconds(clampedTimeLeft)}
        </div>
        <div className="h-[34px] w-[159px] text-center font-['Science_Gothic'] text-[24px] font-bold leading-[34px] tracking-[0px] text-[#FFFFFF]">
          Seconds
        </div>
      </div>
    </div>
  );
}
