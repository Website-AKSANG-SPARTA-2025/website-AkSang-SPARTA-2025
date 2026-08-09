"use client";

import React from "react";
import { cn } from "@/lib/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className={cn(
          `inline-flex items-center justify-center w-[247px] h-[66px] rounded-[40px] px-[36px] py-[24px] gap-[8px] 
          font-['DM_Sans'] font-bold text-[18px] leading-[18px] tracking-[0%] text-center
          transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]`,
          className,
        )}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
