import { Activity, Boxes, KeyRound, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";

const adminModules = [
  {
    title: "Users",
    description: "Manage accounts, roles, quota, security status, and identity bindings.",
    icon: UsersRound,
  },
  {
    title: "Channels",
    description: "Operate provider channels, health checks, tags, balances, and routing state.",
    icon: Activity,
  },
  {
    title: "Models",
    description: "Maintain model metadata, vendors, missing models, and deployment surfaces.",
    icon: Boxes,
  },
  {
    title: "Logs",
    description: "Audit platform traffic, task records, drawing jobs, and usage anomalies.",
    icon: ShieldCheck,
  },
  {
    title: "Redemptions",
    description: "Issue and retire redemption codes for controlled balance distribution.",
    icon: KeyRound,
  },
  {
    title: "Settings",
    description: "Control branding, authentication, billing display, content, and operations.",
    icon: Settings2,
  },
];

export function AdminOverviewPage() {
  return (
    <div className="space-y-7">
      <PageTitle
        description="A focused administrative workspace for operating the platform without disturbing the user console."
        title="Admin Console"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {adminModules.map((module) => {
          const Icon = module.icon;
          return (
            <Card className="min-h-44" key={module.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#2d2926]">{module.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-[#655b50]">{module.description}</p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-md border border-[#d8cbb8] bg-[#f3eadc] text-[#6f5f4b]">
                  <Icon className="size-5" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
