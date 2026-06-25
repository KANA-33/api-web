import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useAuthStore } from "@features/auth/store";
import { Button } from "@shared/ui/button";
import { Card } from "@shared/ui/card";

export function LoginPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await signIn({ username, password });

      if (response.require_2fa) {
        setMessage("Two-factor verification is required before continuing.");
        return;
      }

      await navigate({ to: "/overview" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10 text-[#2d2926]">
      <Card className="w-full max-w-md">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-[#2f3533] text-[#f8f1e7]">
            <KeyRound className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Sign in</h1>
            <p className="text-sm text-[#6d6256]">Open your commercial console.</p>
          </div>
        </div>

        <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium">
            Username
            <input
              autoComplete="username"
              className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Password
            <input
              autoComplete="current-password"
              className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 outline-none focus:border-[#8b765e]"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {message && (
            <p className="rounded-md border border-[#d9bfa7] bg-[#f7eadb] px-3 py-2 text-sm text-[#6a4e38]">
              {message}
            </p>
          )}

          <Button disabled={submitting} type="submit">
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
