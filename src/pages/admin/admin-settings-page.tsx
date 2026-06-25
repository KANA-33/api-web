import { useMemo, useState } from "react";
import { LockKeyhole, Save, Settings2 } from "lucide-react";
import * as settingsApi from "@features/admin/settings/api";
import { useAuthStore } from "@features/auth/store";
import { isRootUser } from "@shared/lib/roles";
import { useAsyncData } from "@shared/lib/use-async-data";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";
import { ErrorBlock, LoadingBlock } from "@shared/ui/state-block";

type FieldType = "boolean" | "json" | "number" | "select" | "text" | "textarea";

interface SettingFieldConfig {
  description: string;
  key: string;
  label: string;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  type: FieldType;
}

interface SettingGroupConfig {
  description: string;
  fields: SettingFieldConfig[];
  title: string;
}

const settingGroups: SettingGroupConfig[] = [
  {
    title: "Brand And Console",
    description: "Visible platform identity and the frontend theme flag used by the backend.",
    fields: [
      {
        description: "Displayed platform name.",
        key: "SystemName",
        label: "System name",
        type: "text",
      },
      {
        description: "Public logo URL used by status and user-facing screens.",
        key: "Logo",
        label: "Logo URL",
        type: "text",
      },
      {
        description: "External address shown to users when the backend exposes it.",
        key: "ServerAddress",
        label: "Server address",
        type: "text",
      },
      {
        description: "Footer text or HTML-compatible content from backend settings.",
        key: "Footer",
        label: "Footer",
        type: "textarea",
      },
      {
        description: "Backend frontend theme selector. Keep default for the new console.",
        key: "theme.frontend",
        label: "Frontend theme",
        options: [
          { label: "Default", value: "default" },
          { label: "Classic", value: "classic" },
        ],
        type: "select",
      },
    ],
  },
  {
    title: "Access And Account Policy",
    description: "Login, registration, demo mode, and self-use mode switches.",
    fields: [
      {
        description: "Allow new user registration.",
        key: "RegisterEnabled",
        label: "Registration",
        type: "boolean",
      },
      {
        description: "Allow username/password sign in.",
        key: "PasswordLoginEnabled",
        label: "Password login",
        type: "boolean",
      },
      {
        description: "Allow password-based registration.",
        key: "PasswordRegisterEnabled",
        label: "Password registration",
        type: "boolean",
      },
      {
        description: "Require email verification where the backend supports it.",
        key: "EmailVerificationEnabled",
        label: "Email verification",
        type: "boolean",
      },
      {
        description: "Enable domain whitelist checks for email addresses.",
        key: "EmailDomainRestrictionEnabled",
        label: "Email domain restriction",
        type: "boolean",
      },
      {
        description: "Comma-separated allowed email domains.",
        key: "EmailDomainWhitelist",
        label: "Email domain whitelist",
        placeholder: "example.com,company.com",
        type: "text",
      },
      {
        description: "Hide self-service surfaces when operating a private deployment.",
        key: "SelfUseModeEnabled",
        label: "Self-use mode",
        type: "boolean",
      },
      {
        description: "Enable demo-site behavior from the backend.",
        key: "DemoSiteEnabled",
        label: "Demo site",
        type: "boolean",
      },
    ],
  },
  {
    title: "Usage And Display",
    description: "Quota display, drawing/task entry points, and export defaults.",
    fields: [
      {
        description: "Show quota values as currency when platform status allows it.",
        key: "DisplayInCurrencyEnabled",
        label: "Display in currency",
        type: "boolean",
      },
      {
        description: "Show token statistics in usage surfaces.",
        key: "DisplayTokenStatEnabled",
        label: "Token statistics",
        type: "boolean",
      },
      {
        description: "Enable drawing-related user features.",
        key: "DrawingEnabled",
        label: "Drawing features",
        type: "boolean",
      },
      {
        description: "Enable task-related user features.",
        key: "TaskEnabled",
        label: "Task features",
        type: "boolean",
      },
      {
        description: "Allow users to export data where supported.",
        key: "DataExportEnabled",
        label: "Data export",
        type: "boolean",
      },
      {
        description: "Backend quota-per-unit used for display conversions.",
        key: "QuotaPerUnit",
        label: "Quota per unit",
        type: "number",
      },
      {
        description: "Low balance reminder threshold in raw quota units.",
        key: "QuotaRemindThreshold",
        label: "Quota reminder threshold",
        type: "number",
      },
      {
        description: "Raw quota consumed before relay completion.",
        key: "PreConsumedQuota",
        label: "Pre-consumed quota",
        type: "number",
      },
    ],
  },
  {
    title: "Overview Content",
    description:
      "JSON-backed content used by user overview cards. Values are validated by the backend.",
    fields: [
      {
        description: "Show API info block on user overview.",
        key: "console_setting.api_info_enabled",
        label: "API info enabled",
        type: "boolean",
      },
      {
        description: "Array of API info objects with url, route, description, and color.",
        key: "console_setting.api_info",
        label: "API info JSON",
        placeholder:
          '[{"url":"https://api.example.com","route":"Default","description":"Primary endpoint","color":"blue"}]',
        type: "json",
      },
      {
        description: "Show announcements block on user overview.",
        key: "console_setting.announcements_enabled",
        label: "Announcements enabled",
        type: "boolean",
      },
      {
        description: "Array of announcements with content, publishDate, type, and optional extra.",
        key: "console_setting.announcements",
        label: "Announcements JSON",
        placeholder:
          '[{"content":"Maintenance window","publishDate":"2026-06-25T00:00:00Z","type":"warning"}]',
        type: "json",
      },
      {
        description: "Show FAQ block on user overview.",
        key: "console_setting.faq_enabled",
        label: "FAQ enabled",
        type: "boolean",
      },
      {
        description: "Array of FAQ objects with question and answer.",
        key: "console_setting.faq",
        label: "FAQ JSON",
        placeholder: '[{"question":"How do I create an API key?","answer":"Open API Keys."}]',
        type: "json",
      },
      {
        description: "Show Uptime Kuma block on user overview.",
        key: "console_setting.uptime_kuma_enabled",
        label: "Uptime Kuma enabled",
        type: "boolean",
      },
      {
        description: "Array of Uptime Kuma groups with categoryName, url, slug, and description.",
        key: "console_setting.uptime_kuma_groups",
        label: "Uptime Kuma JSON",
        placeholder:
          '[{"categoryName":"Core","url":"https://status.example.com","slug":"core","description":"Core APIs"}]',
        type: "json",
      },
    ],
  },
];

function buildOptionMap(options: settingsApi.AdminOption[] | null) {
  return new Map((options ?? []).map((option) => [option.key, option.value]));
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

interface SettingFieldProps {
  config: SettingFieldConfig;
  dirty: boolean;
  onChange: (key: string, value: string) => void;
  onSave: (config: SettingFieldConfig) => void;
  saving: boolean;
  value: string;
}

function SettingField({ config, dirty, onChange, onSave, saving, value }: SettingFieldProps) {
  const invalidJson = config.type === "json" && !isJsonValid(value);
  const commonClass =
    "rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]";

  return (
    <form
      className="grid gap-3 border-b border-[#eadfce] py-4 last:border-b-0"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(config);
      }}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <label className="text-sm font-semibold text-[#2d2926]" htmlFor={config.key}>
            {config.label}
          </label>
          <p className="mt-1 text-sm leading-6 text-[#655b50]">{config.description}</p>
          <p className="mt-1 font-mono text-xs text-[#8d7a63]">{config.key}</p>
        </div>
        <Button
          className="self-start"
          disabled={!dirty || saving || invalidJson}
          type="submit"
          variant={dirty ? "primary" : "secondary"}
        >
          <Save className="mr-2 size-4" />
          {saving ? "Saving" : "Save"}
        </Button>
      </div>

      {config.type === "boolean" && (
        <select
          className={`${commonClass} h-11 max-w-xs`}
          id={config.key}
          onChange={(event) => onChange(config.key, event.target.value)}
          value={value === "true" ? "true" : "false"}
        >
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      )}

      {config.type === "select" && (
        <select
          className={`${commonClass} h-11 max-w-xs`}
          id={config.key}
          onChange={(event) => onChange(config.key, event.target.value)}
          value={value}
        >
          {(config.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {config.type === "text" && (
        <input
          className={`${commonClass} h-11`}
          id={config.key}
          onChange={(event) => onChange(config.key, event.target.value)}
          placeholder={config.placeholder}
          value={value}
        />
      )}

      {config.type === "number" && (
        <input
          className={`${commonClass} h-11 max-w-xs`}
          id={config.key}
          onChange={(event) => onChange(config.key, event.target.value)}
          type="number"
          value={value}
        />
      )}

      {(config.type === "textarea" || config.type === "json") && (
        <textarea
          className={`${commonClass} min-h-32 font-mono text-sm leading-6`}
          id={config.key}
          onChange={(event) => onChange(config.key, event.target.value)}
          placeholder={config.placeholder}
          value={value}
        />
      )}

      {invalidJson && <p className="text-sm font-medium text-[#7a4a3b]">JSON format is invalid.</p>}
    </form>
  );
}

export function AdminSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsyncData(async () => {
    const response = await settingsApi.listOptions();
    const values = Object.fromEntries(response.data.map((option) => [option.key, option.value]));
    setLocalValues(values);
    return response.data;
  }, []);

  const optionMap = useMemo(() => buildOptionMap(data), [data]);

  function getValue(key: string) {
    if (key in localValues) {
      return localValues[key] ?? "";
    }

    return optionMap.get(key) ?? "";
  }

  function isDirty(key: string) {
    return getValue(key) !== (optionMap.get(key) ?? "");
  }

  async function saveField(config: SettingFieldConfig) {
    const value = getValue(config.key);

    if (config.type === "json" && !isJsonValid(value)) {
      setActionMessage("Fix JSON before saving.");
      return;
    }

    setSavingKey(config.key);
    setActionMessage(null);

    try {
      await settingsApi.updateOption({
        key: config.key,
        value: normalizeFieldValue(config.type, value),
      });
      setActionMessage(`${config.label} saved.`);
      await reload();
    } catch (caught) {
      setActionMessage(caught instanceof Error ? caught.message : "Setting update failed");
    } finally {
      setSavingKey(null);
    }
  }

  if (!isRootUser(user)) {
    return (
      <div className="grid gap-6">
        <PageTitle
          description="System settings are protected by root-level backend permissions."
          title="Settings"
        />
        <Card className="border-[#d9bfa7] bg-[#f7eadb]/85">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md border border-[#d8cbb8] bg-[#f3eadc] text-[#6f5f4b]">
              <LockKeyhole className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#5d3d29]">Root access required</h2>
              <p className="mt-2 text-sm leading-6 text-[#6a4e38]">
                This page maps to the backend root-only option API. Use a root account to edit
                branding, authentication switches, and overview content.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageTitle
          description="Root-only configuration for platform identity, access policy, usage display, and overview content."
          title="Settings"
        />
        <Button onClick={() => void reload()} variant="secondary">
          <Settings2 className="mr-2 size-4" />
          Reload
        </Button>
      </div>

      {actionMessage && (
        <Card className="border-[#c9baa4] bg-[#f8f1e7]/85">
          <p className="text-sm font-medium text-[#5d4f41]">{actionMessage}</p>
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
        settingGroups.map((group) => (
          <Card key={group.title}>
            <div className="mb-2">
              <h2 className="text-xl font-semibold text-[#2d2926]">{group.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#655b50]">{group.description}</p>
            </div>
            <div className="mt-2">
              {group.fields.map((field) => (
                <SettingField
                  config={field}
                  dirty={isDirty(field.key)}
                  key={field.key}
                  onChange={(key, value) =>
                    setLocalValues((current) => ({ ...current, [key]: value }))
                  }
                  onSave={(config) => void saveField(config)}
                  saving={savingKey === field.key}
                  value={getValue(field.key)}
                />
              ))}
            </div>
          </Card>
        ))}
    </div>
  );
}
