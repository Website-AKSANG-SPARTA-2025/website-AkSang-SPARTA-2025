import { Button } from "@/components/ui/button";

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
    <div className="w-full rounded-2xl bg-[#9897A9] p-6 text-white shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAEAEA] font-bold text-blue-600 text-xl shadow-sm">
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
          className="rounded-full bg-[#64617F] px-8 py-5 text-sm font-semibold text-white hover:bg-[#52506b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSelected ? "Terpilih" : isFull ? "Tidak Tersedia" : "Pilih"}
        </Button>
      </div>
    </div>
  );
}
