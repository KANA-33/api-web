import { Card } from "@shared/ui/card";

interface ErrorPageProps {
  error?: unknown;
}

export function ErrorPage({ error }: ErrorPageProps) {
  const message = error instanceof Error ? error.message : "The page failed to load.";

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10 text-[#2d2926]">
      <Card className="max-w-lg border-[#d9bfa7] bg-[#f7eadb]/85">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9b6f50]">
          Runtime error
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#5d3d29]">Something needs attention.</h1>
        <p className="mt-3 text-sm leading-6 text-[#6a4e38]">{message}</p>
        <button
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-[#c9baa4] bg-[#efe5d6] px-4 text-sm font-medium text-[#2d2926] transition-colors hover:bg-[#e5d8c5]"
          onClick={() => window.location.reload()}
          type="button"
        >
          Reload
        </button>
      </Card>
    </main>
  );
}
