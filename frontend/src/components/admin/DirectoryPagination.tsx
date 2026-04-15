'use client';

interface DirectoryPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function buildPageNumbers(page: number, totalPages: number): number[] {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 2) {
    return [1, 2, 3];
  }

  if (page >= totalPages - 1) {
    return [totalPages - 2, totalPages - 1, totalPages];
  }

  return [page - 1, page, page + 1];
}

export function DirectoryPagination({
  page,
  totalPages,
  onPageChange,
}: DirectoryPaginationProps) {
  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-orange-100/80 bg-white/75 px-4 py-3">
      <p className="text-sm text-stone-500 sm:text-base">
        Страница {page} из {totalPages}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-2xl border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Назад
        </button>

        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className={`h-10 min-w-10 rounded-2xl px-3 text-sm font-medium transition ${
              pageNumber === page
                ? 'bg-orange-400 text-white shadow-[0_8px_16px_rgba(251,146,60,0.30)]'
                : 'border border-orange-200 bg-white text-stone-600 hover:bg-orange-50'
            }`}
          >
            {pageNumber}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-2xl border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Вперёд
        </button>
      </div>
    </div>
  );
}
