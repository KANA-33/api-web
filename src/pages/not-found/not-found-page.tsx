import { Link } from "@tanstack/react-router";
import { Card } from "@shared/ui/card";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10 text-[#171717]">
      <Card className="max-w-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6c6a67]">
          Not found
        </p>
        <h1 className="mt-3 text-3xl font-semibold">This page does not exist.</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f5958]">
          The route may have changed, or the workspace module may not be available for this account.
        </p>
        <Link
          className="mt-6 inline-flex h-10 items-center justify-center rounded-[2px] bg-[#000000] px-4 text-sm font-medium text-[#fffdfd] transition-colors hover:bg-[#303031]"
          to="/overview"
        >
          Return to overview
        </Link>
      </Card>
    </main>
  );
}
