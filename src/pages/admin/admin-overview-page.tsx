import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Boxes,
  CreditCard,
  KeyRound,
  Settings2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import * as overviewApi from "@features/admin/overview/api";
import { usePlatformStore } from "@features/platform/store";
import { formatQuota, formatRawNumber } from "@shared/lib/quota-format";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";

const adminModules = [
  {
    title: "Users",
    description: "Accounts, roles, quota, status, and identity operations.",
    icon: UsersRound,
    metricKey: "users",
    to: "/admin/users",
  },
  {
    title: "Channels",
    description: "Provider channels, health checks, tags, balances, and routing state.",
    icon: Activity,
    metricKey: "channels",
    to: "/admin/channels",
  },
  {
    title: "Models",
    description: "Model metadata, vendors, missing models, and availability controls.",
    icon: Boxes,
    metricKey: "models",
    to: "/admin/models",
  },
  {
    title: "Logs",
    description: "Usage, drawing, and task records with quota and throughput statistics.",
    icon: ShieldCheck,
    metricKey: "logs",
    to: "/admin/logs",
  },
  {
    title: "Redemptions",
    description: "Code generation, edits, cleanup, and controlled balance distribution.",
    icon: KeyRound,
    metricKey: "redemptions",
    to: "/admin/redemptions",
  },
  {
    title: "Billing",
    description: "Top-up ledger, search, reconciliation, and manual completion.",
    icon: CreditCard,
    metricKey: "billing",
    to: "/admin/billing",
  },
  {
    title: "Settings",
    description: "Root-only branding, access policy, display, and overview content.",
    icon: Settings2,
    metricKey: "settings",
    to: "/admin/settings",
  },
];

const readinessItems = [
  "Core admin routes are connected to backend-compatible protocols.",
  "High-risk payment gateway and security editors remain intentionally deferred.",
  "Smoke test coverage is documented in docs/admin-mvp-smoke-test.md.",
];

function metricValue(
  metricKey: string,
  data: overviewApi.AdminOverviewData | null,
  loading: boolean,
) {
  if (loading) {
    return "...";
  }

  if (metricKey === "logs") {
    return data?.usage ? formatRawNumber(data.usage.rpm) : "Unavailable";
  }

  if (metricKey === "settings") {
    return "Root";
  }

  const metric = data?.metrics.find((item) => item.key === metricKey);

  if (!metric || metric.status === "unavailable") {
    return "Unavailable";
  }

  return formatRawNumber(metric.value ?? undefined);
}

export function AdminOverviewPage() {
  const platformStatus = usePlatformStore((state) => state.status);
  const { data, loading, reload } = useAsyncData(overviewApi.getAdminOverview, []);

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageTitle
          description="A focused administrative workspace for operating the platform without disturbing the user console."
          title="Admin Console"
        />
        <button
          className="inline-flex h-10 items-center justify-center rounded-[2px] border border-[#d4cece] bg-[#efeded] px-4 text-sm font-medium text-[#171717] transition-colors hover:bg-[#e3e2e2]"
          onClick={() => void reload()}
          type="button"
        >
          Refresh overview
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="min-h-52">
          <div className="flex items-start justify-between gap-5">
            <div>
              <h2 className="text-xl font-semibold text-[#171717]">Operational snapshot</h2>
              <p className="mt-2 text-sm leading-6 text-[#5f5958]">
                A light readout of the admin MVP surface. Individual module pages remain the source
                of truth for edits and detailed review.
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-[2px] border border-[#d8d2d2] bg-[#efeded] text-[#5f5958]">
              <Activity className="size-5" />
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6a67]">
                Quota
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {loading ? "..." : formatQuota(data?.usage?.quota, platformStatus)}
              </p>
            </div>
            <div className="rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6a67]">
                RPM
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {loading ? "..." : formatRawNumber(data?.usage?.rpm)}
              </p>
            </div>
            <div className="rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6a67]">
                TPM
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {loading ? "..." : formatRawNumber(data?.usage?.tpm)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="min-h-52">
          <h2 className="text-xl font-semibold text-[#171717]">MVP readiness</h2>
          <div className="mt-5 space-y-3">
            {readinessItems.map((item) => (
              <div className="flex gap-3 text-sm leading-6 text-[#5f5958]" key={item}>
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#5f5958]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {adminModules.map((module) => {
          const Icon = module.icon;
          const value = metricValue(module.metricKey, data, loading);

          return (
            <Link className="group block" key={module.title} to={module.to}>
              <Card className="min-h-48 transition-colors group-hover:border-[#b9a78f] group-hover:bg-[#fffaf2]/84">
                <div className="flex h-full flex-col justify-between gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-[#171717]">{module.title}</h2>
                      <p className="mt-3 text-sm leading-6 text-[#5f5958]">{module.description}</p>
                    </div>
                    <span className="grid size-10 shrink-0 place-items-center rounded-[2px] border border-[#d8d2d2] bg-[#efeded] text-[#5f5958]">
                      <Icon className="size-5" />
                    </span>
                  </div>

                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6c6a67]">
                        {module.metricKey === "logs" ? "RPM" : "Status"}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-[#171717]">{value}</p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-[#242121]">
                      Open
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
