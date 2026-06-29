import { useEffect, useState, type FormEvent } from "react";
import * as authApi from "@features/auth/api";
import { useAuthStore } from "@features/auth/store";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";
import { PageTitle } from "@shared/ui/page-title";

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const refresh = useAuthStore((state) => state.refresh);
  const [username, setUsername] = useState(user?.username ?? "");
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [language, setLanguage] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUsername(user?.username ?? "");
    setDisplayName(user?.display_name ?? "");
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await authApi.updateCurrentUser({
        username,
        display_name: displayName,
        ...(language ? { language } : {}),
      });
      await refresh();
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <PageTitle
        description="Manage identity, preferences, security posture, and workspace language."
        title="Profile"
      />
      <Card className="max-w-2xl">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium">
            Username
            <input
              className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Display name
            <input
              className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
              onChange={(event) => setDisplayName(event.target.value)}
              value={displayName}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Email
            <input
              className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#efeded] px-3 text-[#5f5958] outline-none"
              readOnly
              value={user?.email ?? ""}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Language
            <select
              className="h-11 rounded-[2px] border border-[#d8d2d2] bg-[#fffdfd] px-3 outline-none focus:border-[#000000]"
              onChange={(event) => setLanguage(event.target.value)}
              value={language}
            >
              <option value="">Keep current</option>
              <option value="zh_CN">Chinese</option>
              <option value="en_US">English</option>
            </select>
          </label>

          {message && (
            <p className="rounded-[2px] border border-[#d8d2d2] bg-[#fbf9f9] px-3 py-2 text-sm text-[#5f5958]">
              {message}
            </p>
          )}

          <Button className="justify-self-start" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
