import { FileText, ImageIcon } from "lucide-react";

type TaskAttachment = {
  name: string;
  size: string;
  type: "document" | "image";
  href: string;
};

type DetailTugasCardProps = {
  title: string;
  releaseDate: string;
  dueDate: string;
  description: string;
  points?: string[];
  attachments?: TaskAttachment[];
};

export default function DetailTugasCard({
  title,
  releaseDate,
  dueDate,
  description,
  points = [],
  attachments = [],
}: DetailTugasCardProps) {
  return (
    <section className="w-full max-w-4xl rounded-2xl border border-[#bec8cf]/50 bg-[#D4D2E3] p-5 shadow-sm sm:p-8">
      <div className="mb-2">
        <h1 className="text-2xl font-bold uppercase tracking-wide text-[#5D5A88]">
          {title}
        </h1>
      </div>

      <div className="h-px bg-[#9795B5]" />

      <dl className="my-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-[#3e484e]">
            Tanggal Rilis :
          </dt>
          <dd className="text-base font-medium text-[#181c1f]">
            {releaseDate}
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-[#3e484e]">
            Tanggal Tenggat :
          </dt>
          <dd className="text-base font-medium text-[#ba1a1a]">{dueDate}</dd>
        </div>
      </dl>

      <div className="h-px bg-[#9795B5]" />

      <div className="my-4">
        <h2 className="mb-2 text-xl font-bold text-[#5D5A88]">Deskripsi</h2>
        <div className="text-sm leading-6 text-[#181c1f]">
          <p>{description}</p>

          {points.length > 0 ? (
            <ul className="mt-2 list-inside list-disc space-y-1">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <h2 className="mb-2 text-xl font-bold text-[#5D5A88]">Lampiran</h2>

        {attachments.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {attachments.map((attachment) => {
              const Icon = attachment.type === "image" ? ImageIcon : FileText;

              return (
                <a
                  key={attachment.name}
                  href={attachment.href}
                  className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-[#bec8cf]/50 bg-white p-3 transition-colors hover:bg-[#f0f4f7] md:w-auto md:min-w-52"
                >
                  <Icon className="size-5 shrink-0 text-[#426373]" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-[#181c1f]">
                      {attachment.name}
                    </span>
                    <span className="text-xs font-medium text-[#3e484e]">
                      {attachment.size}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-[#bec8cf] bg-white p-4 text-sm text-[#3e484e]">
            Belum ada lampiran untuk tugas ini.
          </p>
        )}
      </div>
    </section>
  );
}
