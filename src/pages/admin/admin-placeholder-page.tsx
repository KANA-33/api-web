import type { LucideIcon } from "lucide-react";
import { ArrowRight, Construction } from "lucide-react";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";

interface AdminPlaceholderPageProps {
  description: string;
  icon?: LucideIcon;
  title: string;
}

export function AdminPlaceholderPage({
  description,
  icon: Icon = Construction,
  title,
}: AdminPlaceholderPageProps) {
  return (
    <div className="space-y-7">
      <PageTitle description={description} title={title} />

      <Card className="grid min-h-72 place-items-center">
        <div className="max-w-md text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-[2px] border border-[#d8d2d2] bg-[#efeded] text-[#5f5958]">
            <Icon className="size-6" />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-[#171717]">Phase 1 shell ready</h2>
          <p className="mt-3 text-sm leading-6 text-[#5f5958]">
            This route is wired, protected, and ready for protocol-first implementation in the next
            phase.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-[2px] border border-[#d8d2d2] bg-[#fbf9f9] px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] text-[#6c6a67]">
            Admin route active
            <ArrowRight className="size-3.5" />
          </div>
        </div>
      </Card>
    </div>
  );
}
