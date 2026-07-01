import { useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  Database,
  FileText,
  LockKeyhole,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import * as settingsApi from "@features/admin/settings/api";
import { useAuthStore } from "@features/auth/store";
import { usePlatformStore } from "@features/platform/store";
import { formatRawNumber } from "@shared/lib/quota-format";
import { isRootUser } from "@shared/lib/roles";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";
import { useSensitiveConfirmation } from "@shared/ui/sensitive-confirmation";
import { ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

type FieldType = "boolean" | "json" | "number" | "select" | "text" | "textarea";

interface SettingFieldConfig {
  key: string;
  label: string;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  type: FieldType;
}

interface ApiInfoItem {
  color?: string;
  description?: string;
  route?: string;
  url?: string;
}

interface AnnouncementItem {
  content?: string;
  extra?: string;
  publishDate?: string;
  type?: string;
}

interface FAQItem {
  answer?: string;
  question?: string;
}

interface UptimeGroupItem {
  categoryName?: string;
  description?: string;
  slug?: string;
  url?: string;
}

const basicGroups = [
  {
    title: "Brand And Access",
    fields: [
      { key: "SystemName", label: "System name", type: "text" },
      { key: "Logo", label: "Logo URL", type: "text" },
      { key: "ServerAddress", label: "Server address", type: "text" },
      { key: "Footer", label: "Footer", type: "textarea" },
      {
        key: "theme.frontend",
        label: "Frontend theme",
        options: [
          { label: "Default", value: "default" },
          { label: "Classic", value: "classic" },
        ],
        type: "select",
      },
      { key: "RegisterEnabled", label: "Registration", type: "boolean" },
      { key: "PasswordLoginEnabled", label: "Password login", type: "boolean" },
      { key: "PasswordRegisterEnabled", label: "Password registration", type: "boolean" },
      { key: "EmailVerificationEnabled", label: "Email verification", type: "boolean" },
      { key: "EmailDomainRestrictionEnabled", label: "Email domain restriction", type: "boolean" },
      { key: "EmailDomainWhitelist", label: "Email domain whitelist", type: "text" },
      { key: "SelfUseModeEnabled", label: "Self-use mode", type: "boolean" },
      { key: "DemoSiteEnabled", label: "Demo site", type: "boolean" },
    ] satisfies SettingFieldConfig[],
  },
  {
    title: "Usage And Display",
    fields: [
      { key: "DisplayInCurrencyEnabled", label: "Display in currency", type: "boolean" },
      { key: "DisplayTokenStatEnabled", label: "Token statistics", type: "boolean" },
      { key: "DrawingEnabled", label: "Drawing features", type: "boolean" },
      { key: "TaskEnabled", label: "Task features", type: "boolean" },
      { key: "DataExportEnabled", label: "Data export", type: "boolean" },
      { key: "QuotaPerUnit", label: "Quota per unit", type: "number" },
      { key: "QuotaRemindThreshold", label: "Quota reminder threshold", type: "number" },
      { key: "PreConsumedQuota", label: "Pre-consumed quota", type: "number" },
    ] satisfies SettingFieldConfig[],
  },
  {
    title: "Security And Limits",
    fields: [
      { key: "fetch_setting.enable_ssrf_protection", label: "SSRF protection", type: "boolean" },
      { key: "fetch_setting.allow_private_ip", label: "Allow private IP", type: "boolean" },
      { key: "fetch_setting.domain_filter_mode", label: "Domain whitelist mode", type: "boolean" },
      { key: "fetch_setting.ip_filter_mode", label: "IP whitelist mode", type: "boolean" },
      { key: "fetch_setting.domain_list", label: "Domain list JSON", type: "json" },
      { key: "fetch_setting.ip_list", label: "IP list JSON", type: "json" },
      { key: "fetch_setting.allowed_ports", label: "Allowed ports JSON", type: "json" },
      { key: "CheckSensitiveEnabled", label: "Sensitive word checks", type: "boolean" },
      {
        key: "CheckSensitiveOnPromptEnabled",
        label: "Check prompts for sensitive words",
        type: "boolean",
      },
      { key: "StopOnSensitiveEnabled", label: "Stop on sensitive word", type: "boolean" },
      { key: "SensitiveWords", label: "Sensitive words", type: "textarea" },
      { key: "ModelRequestRateLimitEnabled", label: "Model request rate limit", type: "boolean" },
      { key: "ModelRequestRateLimitCount", label: "Request count limit", type: "number" },
      {
        key: "ModelRequestRateLimitDurationMinutes",
        label: "Rate limit window minutes",
        type: "number",
      },
      { key: "ModelRequestRateLimitSuccessCount", label: "Success count limit", type: "number" },
      { key: "ModelRequestRateLimitGroup", label: "Group limits JSON", type: "json" },
      { key: "StreamCacheQueueLength", label: "Stream cache queue length", type: "number" },
    ] satisfies SettingFieldConfig[],
  },
  {
    title: "Performance Configuration",
    fields: [
      { key: "performance_setting.disk_cache_enabled", label: "Disk cache", type: "boolean" },
      {
        key: "performance_setting.disk_cache_threshold_mb",
        label: "Disk cache threshold MB",
        type: "number",
      },
      {
        key: "performance_setting.disk_cache_max_size_mb",
        label: "Disk cache max size MB",
        type: "number",
      },
      { key: "performance_setting.disk_cache_path", label: "Disk cache path", type: "text" },
      { key: "performance_setting.monitor_enabled", label: "Performance monitor", type: "boolean" },
      {
        key: "performance_setting.monitor_cpu_threshold",
        label: "CPU threshold",
        type: "number",
      },
      {
        key: "performance_setting.monitor_memory_threshold",
        label: "Memory threshold",
        type: "number",
      },
      {
        key: "performance_setting.monitor_disk_threshold",
        label: "Disk threshold",
        type: "number",
      },
    ] satisfies SettingFieldConfig[],
  },
] as const;

function buildOptionMap(options: settingsApi.AdminOption[] | null) {
  return new Map((options ?? []).map((option) => [option.key, option.value]));
}

function parseJsonArray<T>(value: string | undefined, fallback: T[]): T[] {
  if (!value?.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function isJsonValid(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeFieldValue(type: FieldType, value: string) {
  if (type === "boolean") {
    return value === "true";
  }

  if (type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}

function bytes(value?: number) {
  if (!value) {
    return "0 B";
  }

  if (value > 1024 * 1024 * 1024) {
    return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
  if (value > 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
  }
  if (value > 1024) {
    return `${(value / 1024).toFixed(2)} KB`;
  }
  return `${value} B`;
}

function time(value?: string) {
  return value ? new Date(value).toLocaleString() : "N/A";
}

export function AdminSettingsPage() {
  const confirmSensitive = useSensitiveConfirmation();
  const user = useAuthStore((state) => state.user);
  const reloadPlatformStatus = usePlatformStore((state) => state.load);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [cleanupMode, setCleanupMode] = useState<"by_count" | "by_days">("by_count");
  const [cleanupValue, setCleanupValue] = useState("10");

  const { data, error, loading, reload } = useAsyncData(async () => {
    const response = await settingsApi.listOptions();
    setLocalValues(Object.fromEntries(response.data.map((option) => [option.key, option.value])));
    return response.data;
  }, []);

  const {
    data: performanceStats,
    error: performanceError,
    reload: reloadPerformance,
  } = useAsyncData(async () => {
    if (!isRootUser(user)) {
      return null;
    }

    const response = await settingsApi.getPerformanceStats();
    return response.data;
  }, [user?.role]);

  const {
    data: performanceLogs,
    error: logsError,
    reload: reloadLogs,
  } = useAsyncData(async () => {
    if (!isRootUser(user)) {
      return null;
    }

    const response = await settingsApi.getPerformanceLogs();
    return response.data;
  }, [user?.role]);

  const optionMap = useMemo(() => buildOptionMap(data), [data]);

  function getValue(key: string) {
    return localValues[key] ?? optionMap.get(key) ?? "";
  }

  function isDirty(key: string) {
    return getValue(key) !== (optionMap.get(key) ?? "");
  }

  function updateValue(key: string, value: string) {
    setLocalValues((current) => ({ ...current, [key]: value }));
  }

  async function saveFields(groupTitle: string, fields: SettingFieldConfig[]) {
    const invalid = fields.find(
      (field) => field.type === "json" && !isJsonValid(getValue(field.key)),
    );
    if (invalid) {
      setActionMessage(`${invalid.label} has invalid JSON.`);
      return;
    }

    const dirtyFields = fields.filter((field) => isDirty(field.key));
    if (dirtyFields.length === 0) {
      return;
    }

    const sensitive =
      groupTitle === "Security And Limits" || groupTitle === "Performance Configuration";
    const result = await confirmSensitive({
      actionLabel: `Save ${groupTitle}`,
      confirmText: groupTitle,
      description: `Save ${dirtyFields.length} changed setting${dirtyFields.length === 1 ? "" : "s"} in ${groupTitle}.`,
      intent: sensitive ? "danger" : "warning",
      reasonLabel: "Operational reason",
      requireReason: sensitive,
      title: "Save settings group",
    });
    if (!result.confirmed) {
      return;
    }

    setSavingGroup(groupTitle);
    try {
      for (const field of dirtyFields) {
        await settingsApi.updateOption({
          key: field.key,
          value: normalizeFieldValue(field.type, getValue(field.key)),
        });
      }
      setActionMessage(`${groupTitle} saved.`);
      await reload();
      if (dirtyFields.some((field) => field.key === "SystemName" || field.key === "Logo")) {
        await reloadPlatformStatus(true);
      }
      await reloadPerformance();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Settings group update failed.");
    } finally {
      setSavingGroup(null);
    }
  }

  async function saveConsoleContent() {
    const apiInfo = parseJsonArray<ApiInfoItem>(getValue("console_setting.api_info"), []);
    const announcements = parseJsonArray<AnnouncementItem>(
      getValue("console_setting.announcements"),
      [],
    );
    const faq = parseJsonArray<FAQItem>(getValue("console_setting.faq"), []);
    const uptimeGroups = parseJsonArray<UptimeGroupItem>(
      getValue("console_setting.uptime_kuma_groups"),
      [],
    );

    setSavingKey("console_content");
    try {
      await settingsApi.updateOption({
        key: "console_setting.api_info",
        value: JSON.stringify(apiInfo),
      });
      await settingsApi.updateOption({
        key: "console_setting.announcements",
        value: JSON.stringify(announcements),
      });
      await settingsApi.updateOption({
        key: "console_setting.faq",
        value: JSON.stringify(faq),
      });
      await settingsApi.updateOption({
        key: "console_setting.uptime_kuma_groups",
        value: JSON.stringify(uptimeGroups),
      });
      setActionMessage("Structured console content saved.");
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Console content update failed.");
    } finally {
      setSavingKey(null);
    }
  }

  async function runOperation(
    title: string,
    actionLabel: string,
    operation: () => Promise<unknown>,
    danger = false,
  ) {
    const result = await confirmSensitive({
      actionLabel,
      confirmText: title,
      description: `Run operation: ${title}.`,
      intent: danger ? "danger" : "warning",
      reasonLabel: "Operational reason",
      requireReason: danger,
      title,
    });
    if (!result.confirmed) {
      return;
    }

    try {
      await operation();
      setActionMessage(`${title} completed.`);
      await reloadPerformance();
      await reloadLogs();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Operation failed.");
    }
  }

  function renderField(config: SettingFieldConfig) {
    const value = getValue(config.key);
    const commonClass =
      "rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]";

    return (
      <div
        className="grid gap-2 rounded-[2px] border border-[#efeded] bg-[#fbf9f9] p-3"
        key={config.key}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <label className="text-sm font-semibold" htmlFor={config.key}>
              {config.label}
            </label>
            <p className="mt-1 font-mono text-xs text-[#6c6a67]">{config.key}</p>
          </div>
          {isDirty(config.key) && (
            <span className="text-xs font-medium text-[#5f5958]">Changed</span>
          )}
        </div>

        {config.type === "boolean" && (
          <select
            className={`${commonClass} h-10`}
            id={config.key}
            onChange={(event) => updateValue(config.key, event.target.value)}
            value={value === "true" ? "true" : "false"}
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        )}
        {config.type === "select" && (
          <select
            className={`${commonClass} h-10`}
            id={config.key}
            onChange={(event) => updateValue(config.key, event.target.value)}
            value={value}
          >
            {(config.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
        {(config.type === "text" || config.type === "number") && (
          <input
            className={`${commonClass} h-10`}
            id={config.key}
            onChange={(event) => updateValue(config.key, event.target.value)}
            placeholder={config.placeholder}
            type={config.type === "number" ? "number" : "text"}
            value={value}
          />
        )}
        {(config.type === "textarea" || config.type === "json") && (
          <textarea
            className={`${commonClass} min-h-24 font-mono text-sm`}
            id={config.key}
            onChange={(event) => updateValue(config.key, event.target.value)}
            placeholder={config.placeholder}
            value={value}
          />
        )}
        {config.type === "json" && !isJsonValid(value) && (
          <p className="text-sm text-[#7f1d1d]">Invalid JSON</p>
        )}
      </div>
    );
  }

  if (!isRootUser(user)) {
    return (
      <div className="grid gap-6">
        <PageTitle
          description="System settings are protected by root-level backend permissions."
          title="Settings"
        />
        <Card className="border-[#d8d2d2] bg-[#f3f1f1]/85">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[2px] border border-[#d8d2d2] bg-[#efeded] text-[#5f5958]">
              <LockKeyhole className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#171717]">Root access required</h2>
              <p className="mt-2 text-sm leading-6 text-[#3b3736]">
                This page maps to root-only backend settings and operations.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const apiInfo = parseJsonArray<ApiInfoItem>(getValue("console_setting.api_info"), []);
  const announcements = parseJsonArray<AnnouncementItem>(
    getValue("console_setting.announcements"),
    [],
  );
  const faq = parseJsonArray<FAQItem>(getValue("console_setting.faq"), []);
  const uptimeGroups = parseJsonArray<UptimeGroupItem>(
    getValue("console_setting.uptime_kuma_groups"),
    [],
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageTitle
          description="Root-only configuration for platform settings, console content, and operational tools."
          title="Settings"
        />
        <Button
          onClick={() => {
            void reload();
            void reloadPerformance();
            void reloadLogs();
          }}
          variant="secondary"
        >
          <RefreshCw className="mr-2 size-4" />
          Reload
        </Button>
      </div>

      {actionMessage && (
        <Card className="border-[#d4cece] bg-[#fffdfd]/85">
          <p className="text-sm font-medium text-[#3b3736]">{actionMessage}</p>
        </Card>
      )}

      {loading && <LoadingBlock title="Loading settings" />}
      {error && (
        <ErrorBlock
          actionLabel="Retry"
          description={error}
          onAction={() => void reload()}
          title="Settings unavailable"
        />
      )}

      {!loading &&
        !error &&
        basicGroups.map((group) => (
          <Card key={group.title}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{group.title}</h2>
                <p className="mt-2 text-sm text-[#5f5958]">
                  {group.fields.filter((field) => isDirty(field.key)).length} pending changes
                </p>
              </div>
              <Button
                disabled={
                  savingGroup === group.title || group.fields.every((field) => !isDirty(field.key))
                }
                onClick={() => void saveFields(group.title, [...group.fields])}
                type="button"
              >
                <Save className="mr-2 size-4" />
                Save {group.title}
              </Button>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {group.fields.map((field) => renderField(field))}
            </div>
          </Card>
        ))}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#5f5958]">
              <FileText className="size-4" />
              Structured console content
            </div>
            <h2 className="mt-3 text-xl font-semibold">Overview content editors</h2>
          </div>
          <Button
            disabled={savingKey === "console_content"}
            onClick={() => void saveConsoleContent()}
            type="button"
          >
            <Save className="mr-2 size-4" />
            Save overview content
          </Button>
        </div>
        <div className="mt-5 grid gap-5">
          <ConsoleApiInfoEditor
            items={apiInfo}
            setItems={(items) =>
              updateValue("console_setting.api_info", JSON.stringify(items, null, 2))
            }
          />
          <ConsoleAnnouncementEditor
            items={announcements}
            setItems={(items) =>
              updateValue("console_setting.announcements", JSON.stringify(items, null, 2))
            }
          />
          <ConsoleFAQEditor
            items={faq}
            setItems={(items) => updateValue("console_setting.faq", JSON.stringify(items, null, 2))}
          />
          <ConsoleUptimeEditor
            items={uptimeGroups}
            setItems={(items) =>
              updateValue("console_setting.uptime_kuma_groups", JSON.stringify(items, null, 2))
            }
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-sm font-medium text-[#5f5958]">
          <Activity className="size-4" />
          Performance and operations
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Metric label="Memory alloc" value={bytes(performanceStats?.memory_stats?.alloc)} />
          <Metric
            label="Goroutines"
            value={formatRawNumber(performanceStats?.memory_stats?.num_goroutine)}
          />
          <Metric label="Cache size" value={bytes(performanceStats?.disk_cache_info?.total_size)} />
          <Metric
            label="Disk used"
            value={`${performanceStats?.disk_space_info?.used_percent?.toFixed?.(1) ?? "0"}%`}
          />
        </div>
        {performanceError && <p className="mt-4 text-sm text-[#7f1d1d]">{performanceError}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() =>
              void runOperation("Force GC", "Run GC", () => settingsApi.forceGC(), false)
            }
            type="button"
            variant="secondary"
          >
            Force GC
          </Button>
          <Button
            onClick={() =>
              void runOperation(
                "Clear disk cache",
                "Clear cache",
                () => settingsApi.clearDiskCache(),
                true,
              )
            }
            type="button"
            variant="secondary"
          >
            <Database className="mr-2 size-4" />
            Clear disk cache
          </Button>
          <Button
            onClick={() =>
              void runOperation(
                "Reset performance stats",
                "Reset stats",
                () => settingsApi.resetPerformanceStats(),
                true,
              )
            }
            type="button"
            variant="secondary"
          >
            Reset stats
          </Button>
        </div>

        <div className="mt-6 rounded-[2px] border border-[#efeded] bg-[#fbf9f9] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-semibold">Log files</h3>
              <p className="mt-1 text-sm text-[#5f5958]">
                {performanceLogs?.enabled ? performanceLogs.log_dir : "Log directory unavailable"}
              </p>
            </div>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void runOperation(
                  "Cleanup log files",
                  "Cleanup logs",
                  () =>
                    settingsApi.cleanupPerformanceLogs({
                      mode: cleanupMode,
                      value: Number(cleanupValue),
                    }),
                  true,
                );
              }}
            >
              <select
                className="h-10 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm"
                onChange={(event) => setCleanupMode(event.target.value as "by_count" | "by_days")}
                value={cleanupMode}
              >
                <option value="by_count">Keep newest count</option>
                <option value="by_days">Delete older than days</option>
              </select>
              <input
                className="h-10 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm"
                min={1}
                onChange={(event) => setCleanupValue(event.target.value)}
                type="number"
                value={cleanupValue}
              />
              <Button type="submit" variant="secondary">
                <Trash2 className="mr-2 size-4" />
                Cleanup logs
              </Button>
            </form>
          </div>
          {logsError && <p className="mt-4 text-sm text-[#7f1d1d]">{logsError}</p>}
          <div className="mt-4 grid gap-2">
            {(performanceLogs?.files ?? []).slice(0, 6).map((file) => (
              <div
                className="grid gap-2 rounded-[2px] border border-[#efeded] bg-[#fffdfd] p-3 text-sm md:grid-cols-[1fr_auto_auto]"
                key={file.name}
              >
                <span className="font-mono text-xs">{file.name}</span>
                <span>{bytes(file.size)}</span>
                <span className="text-[#5f5958]">{time(file.mod_time)}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[2px] border border-[#efeded] bg-[#fbf9f9] p-4">
      <p className="text-sm text-[#6c6a67]">{label}</p>
      <strong className="mt-2 block text-2xl">{value}</strong>
    </div>
  );
}

function rowInput(
  value: string | undefined,
  onChange: (value: string) => void,
  placeholder: string,
) {
  return (
    <input
      className="h-10 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 text-sm outline-none focus:border-[#000000]"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      value={value ?? ""}
    />
  );
}

function EditorShell({
  children,
  onAdd,
  title,
}: {
  children: React.ReactNode;
  onAdd: () => void;
  title: string;
}) {
  return (
    <div className="rounded-[2px] border border-[#efeded] bg-[#fbf9f9] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex gap-2">
          <Button onClick={onAdd} type="button" variant="secondary">
            <Plus className="mr-2 size-4" />
            Add
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3">{children}</div>
    </div>
  );
}

function ConsoleApiInfoEditor({
  items,
  setItems,
}: {
  items: ApiInfoItem[];
  setItems: (items: ApiInfoItem[]) => void;
}) {
  return (
    <EditorShell
      onAdd={() => setItems([...items, { color: "blue", description: "", route: "", url: "" }])}
      title="API info"
    >
      {items.map((item, index) => (
        <div className="grid gap-2 md:grid-cols-4" key={index}>
          {rowInput(
            item.route,
            (value) => setItems(items.map((x, i) => (i === index ? { ...x, route: value } : x))),
            "Route",
          )}
          {rowInput(
            item.url,
            (value) => setItems(items.map((x, i) => (i === index ? { ...x, url: value } : x))),
            "URL",
          )}
          {rowInput(
            item.description,
            (value) =>
              setItems(items.map((x, i) => (i === index ? { ...x, description: value } : x))),
            "Description",
          )}
          {rowInput(
            item.color,
            (value) => setItems(items.map((x, i) => (i === index ? { ...x, color: value } : x))),
            "Color",
          )}
        </div>
      ))}
    </EditorShell>
  );
}

function ConsoleAnnouncementEditor(props: {
  items: AnnouncementItem[];
  setItems: (items: AnnouncementItem[]) => void;
}) {
  const { items, setItems } = props;
  return (
    <EditorShell
      onAdd={() => setItems([...items, { content: "", publishDate: "", type: "info" }])}
      title="Announcements"
    >
      {items.map((item, index) => (
        <div className="grid gap-2 md:grid-cols-4" key={index}>
          {rowInput(
            item.type,
            (value) => setItems(items.map((x, i) => (i === index ? { ...x, type: value } : x))),
            "Type",
          )}
          {rowInput(
            item.publishDate,
            (value) =>
              setItems(items.map((x, i) => (i === index ? { ...x, publishDate: value } : x))),
            "Publish date",
          )}
          {rowInput(
            item.content,
            (value) => setItems(items.map((x, i) => (i === index ? { ...x, content: value } : x))),
            "Content",
          )}
          {rowInput(
            item.extra,
            (value) => setItems(items.map((x, i) => (i === index ? { ...x, extra: value } : x))),
            "Extra",
          )}
        </div>
      ))}
    </EditorShell>
  );
}

function ConsoleFAQEditor(props: { items: FAQItem[]; setItems: (items: FAQItem[]) => void }) {
  const { items, setItems } = props;
  return (
    <EditorShell onAdd={() => setItems([...items, { answer: "", question: "" }])} title="FAQ">
      {items.map((item, index) => (
        <div className="grid gap-2 md:grid-cols-2" key={index}>
          {rowInput(
            item.question,
            (value) => setItems(items.map((x, i) => (i === index ? { ...x, question: value } : x))),
            "Question",
          )}
          {rowInput(
            item.answer,
            (value) => setItems(items.map((x, i) => (i === index ? { ...x, answer: value } : x))),
            "Answer",
          )}
        </div>
      ))}
    </EditorShell>
  );
}

function ConsoleUptimeEditor(props: {
  items: UptimeGroupItem[];
  setItems: (items: UptimeGroupItem[]) => void;
}) {
  const { items, setItems } = props;
  return (
    <EditorShell
      onAdd={() => setItems([...items, { categoryName: "", description: "", slug: "", url: "" }])}
      title="Uptime Kuma groups"
    >
      {items.map((item, index) => (
        <div className="grid gap-2 md:grid-cols-4" key={index}>
          {rowInput(
            item.categoryName,
            (value) =>
              setItems(items.map((x, i) => (i === index ? { ...x, categoryName: value } : x))),
            "Category",
          )}
          {rowInput(
            item.url,
            (value) => setItems(items.map((x, i) => (i === index ? { ...x, url: value } : x))),
            "URL",
          )}
          {rowInput(
            item.slug,
            (value) => setItems(items.map((x, i) => (i === index ? { ...x, slug: value } : x))),
            "Slug",
          )}
          {rowInput(
            item.description,
            (value) =>
              setItems(items.map((x, i) => (i === index ? { ...x, description: value } : x))),
            "Description",
          )}
        </div>
      ))}
    </EditorShell>
  );
}
