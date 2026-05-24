interface Props {
  percent: number; // 0–100
  doneCount: number;
  totalCount: number;
}

export function CompletionBar({ percent, doneCount, totalCount }: Props) {
  return (
    <div className="mx-4 my-3 p-4 bg-white dark:bg-ink-700 rounded-2xl border border-ink-100 dark:border-ink-700">
      <div className="flex flex-row items-end justify-between mb-2">
        <span className="text-sm font-semibold text-ink-900 dark:text-white">
          Profile completion
        </span>
        <span className="text-[11px] text-ink-500 dark:text-ink-100">
          {doneCount} of {totalCount} · {percent}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-ink-100 dark:bg-ink-900">
        <div
          className="h-full transition-[width] duration-300"
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #06B6D4, #7C3AED)',
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
}
