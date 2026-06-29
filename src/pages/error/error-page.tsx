import { Card } from "@shared/ui/card";

interface ErrorPageProps {
  error?: unknown;
}

export function ErrorPage({ error }: ErrorPageProps) {
  const message = error instanceof Error ? error.message : "The page failed to load.";

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10 text-[#171717]">
      <Card className="max-w-lg border-[#d8d2d2] bg-[#f3f1f1]/85">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5f5958]">
          Runtime error
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#171717]">Something needs attention.</h1>
        <p className="mt-3 text-sm leading-6 text-[#3b3736]">{message}</p>
        <button
          className="mt-6 inline-flex h-10 items-center justify-center rounded-[2px] border border-[#d4cece] bg-[#efeded] px-4 text-sm font-medium text-[#171717] transition-colors hover:bg-[#e3e2e2]"
          onClick={() => window.location.reload()}
          type="button"
        >
          Reload
        </button>
      </Card>
    </main>
  );
}
