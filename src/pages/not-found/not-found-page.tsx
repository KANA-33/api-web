import { Link } from "@tanstack/react-router";
import { Card } from "@shared/ui/card";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10 text-[#2d2926]">
      <Card className="max-w-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8d7a63]">
          Not found
        </p>
        <h1 className="mt-3 text-3xl font-semibold">This page does not exist.</h1>
        <p className="mt-3 text-sm leading-6 text-[#655b50]">
          The route may have changed, or the workspace module may not be available for this account.
        </p>
        <Link
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-[#2f3533] px-4 text-sm font-medium text-[#f8f1e7] transition-colors hover:bg-[#1f2422]"
          to="/overview"
        >
          Return to overview
        </Link>
      </Card>
    </main>
  );
}
