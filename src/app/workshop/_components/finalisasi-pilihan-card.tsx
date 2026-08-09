"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/cn";

/**
 * Palette is intentionally hardcoded: this card has its own identity and does
 * not follow the neutral shadcn theme tokens. Change these to restyle it.
 */
const SURFACE = "bg-[#5d5a88]";
const BOX = "bg-[#c9c9d2]";
const ACTION = "bg-[#ece8f3] text-[#4a4470] hover:bg-white";

export type FinalisasiPilihanCardProps = {
  title?: string;
  subtitle?: string;
  question?: string;
  actionLabel?: string;
  /** Controlled checked state. Omit to let the card manage its own. */
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onContinue?: () => void;
  className?: string;
};

export function FinalisasiPilihanCard({
  title = "Finalisasi Pilihan",
  subtitle = "Misal : Businnes Case Competition",
  question = "Tertarik ikut Talkshow ?",
  actionLabel = "Lanjut",
  checked,
  defaultChecked = false,
  onCheckedChange,
  onContinue,
  className,
}: FinalisasiPilihanCardProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : uncontrolled;
  const labelId = React.useId();

  function toggle(next: boolean) {
    if (!isControlled) {
      setUncontrolled(next);
    }
    onCheckedChange?.(next);
  }

  return (
    <div
      className={cn("rounded-[28px] border-2 p-8 sm:p-10", SURFACE, className)}
    >
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
        <div className="flex flex-col gap-5">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>

          <p className="text-base font-semibold text-white/95">{subtitle}</p>

          <div className="flex items-center gap-2.5">
            <Checkbox
              checked={isChecked}
              onCheckedChange={toggle}
              aria-labelledby={labelId}
              className={cn(
                "size-[18px] rounded-[5px] border-0 data-checked:bg-white data-checked:text-[#615c8c]",
                BOX,
              )}
            />
            {/*
              Plain span rather than a <label>: Base UI renders a hidden native
              input alongside the root button, so a wrapping label would fire
              twice when the box itself is clicked. aria-labelledby supplies the
              accessible name, and the checkbox stays the keyboard target.
            */}
            <span
              id={labelId}
              onClick={() => toggle(!isChecked)}
              className="cursor-pointer text-base font-semibold text-white select-none"
            >
              {question}
            </span>
          </div>
        </div>

        <Button
          onClick={onContinue}
          className={cn(
            "h-auto shrink-0 self-end rounded-full px-7 py-2.5 text-sm font-medium",
            ACTION,
          )}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
