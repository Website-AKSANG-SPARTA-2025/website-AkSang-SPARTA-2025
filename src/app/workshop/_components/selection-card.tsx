import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const SURFACE = "bg-[#7c7a9e]";
const BOX = "bg-[#d9d9d9] text-blue-600";
const ACTION = "bg-[#ece8f3] text-[#4a4470] hover:bg-white";

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
        "w-full rounded-2xl p-6 text-white shadow-sm transition-all hover:shadow-md border-1 border-transparent",
        SURFACE,
        isSelected && "border-white",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg font-bold text-xl shadow-sm",
            BOX,
          )}
        >
          {option}
        </div>
        <div className="font-semibold text-sm mt-1">
          {isFull ? "Penuh" : `${slot_remaining}/${slot_max} tersisa`}
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-white/90 leading-relaxed line-clamp-4">
          {description}
        </p>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={onSelect}
          disabled={isFull && !isSelected}
          className={cn(
            "rounded-full px-8 py-5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            ACTION,
          )}
        >
          {isSelected ? "Terpilih" : isFull ? "Tidak Tersedia" : "Pilih"}
        </Button>
      </div>
    </div>
  );
}
