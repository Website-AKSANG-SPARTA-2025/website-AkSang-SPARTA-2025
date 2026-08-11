import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const SURFACE = "bg-[#ffffff]";
const BOX = "bg-[#d9d9d9]";
const ACTION =
  "bg-gradient-to-r from-[#2247B0] to-[#9BDBFF] hover:brightness-110";

interface SelectionCardProps {
  option?: string;
  title?: string;
  description?: string;
  slot_remaining?: number;
  slot_max?: number;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function SelectionCard({
  option = "A",
  title = "Capture The Flag",
  description = "Lorem Ipsum Dolor Sit Amet",
  slot_remaining = 100,
  slot_max = 100,
  isSelected = false,
  onSelect,
}: SelectionCardProps) {
  const isFull = slot_remaining === 0;

  return (
    <div
      className={cn(
        "w-full rounded-2xl p-6 text-[#0D1027] shadow-sm transition-all hover:shadow-md border border-transparent",
        SURFACE,
        isSelected && "border-[#0D1027]",
      )}
    >
      <div className="relative flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg font-bold text-xl shadow-sm",
            BOX,
          )}
        >
          {option}
        </div>
        <div className="absolute right-0 top-0 font-bold text-xl mr-2 text-right">
          {isFull ? (
            "Penuh"
          ) : (
            <>
              {" "}
              {slot_remaining}/{slot_max} <br /> tersisa{" "}
            </>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-[#0D1027]/90 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={onSelect}
          disabled={isFull && !isSelected}
          className={cn(
            "rounded-full px-6 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
            ACTION,
          )}
        >
          {isSelected ? "Terpilih" : isFull ? "Tidak Tersedia" : "Pilih"}
        </Button>
      </div>
    </div>
  );
}
