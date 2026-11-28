export default function Pagination({ summary }: { summary: string }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-seller-muted">
      <span className="min-w-0 break-words">{summary}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E8F1] bg-white text-seller-ink">
          ‹
        </button>
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg bg-seller-navy text-white">
          1
        </button>
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E8F1] bg-white text-seller-ink">
          2
        </button>
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E8F1] bg-white text-seller-ink">
          3
        </button>
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E8F1] bg-white text-seller-ink">
          ›
        </button>
      </div>
    </div>
  );
}
