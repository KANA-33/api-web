import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";

export interface SensitiveConfirmationRequest {
  actionLabel?: string;
  cancelLabel?: string;
  confirmText?: string;
  description: string;
  intent?: "danger" | "warning";
  reasonLabel?: string;
  requireReason?: boolean;
  title: string;
}

interface SensitiveConfirmationResult {
  confirmed: boolean;
  reason?: string;
}

interface PendingConfirmation extends SensitiveConfirmationRequest {
  resolve: (result: SensitiveConfirmationResult) => void;
}

interface SensitiveConfirmationContextValue {
  confirm: (request: SensitiveConfirmationRequest) => Promise<SensitiveConfirmationResult>;
}

const SensitiveConfirmationContext = createContext<SensitiveConfirmationContextValue | null>(null);

export function SensitiveConfirmationProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [typedText, setTypedText] = useState("");
  const [reason, setReason] = useState("");

  const value = useMemo<SensitiveConfirmationContextValue>(
    () => ({
      confirm(request) {
        setTypedText("");
        setReason("");
        return new Promise((resolve) => {
          setPending({ ...request, resolve });
        });
      },
    }),
    [],
  );

  function close(result: SensitiveConfirmationResult) {
    pending?.resolve(result);
    setPending(null);
    setTypedText("");
    setReason("");
  }

  const confirmTextMatches = pending?.confirmText ? typedText === pending.confirmText : true;
  const reasonMatches = pending?.requireReason ? reason.trim().length > 0 : true;
  const canConfirm = Boolean(pending && confirmTextMatches && reasonMatches);
  const danger = pending?.intent !== "warning";

  return (
    <SensitiveConfirmationContext.Provider value={value}>
      {children}
      {pending && (
        <div
          aria-labelledby="sensitive-confirmation-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-[#1e1a16]/45 px-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-lg border border-[#d8cbb8] bg-[#fbf6ee] p-5 text-[#2d2926] shadow-[0_24px_80px_rgb(49_41_31_/_0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span
                  className={
                    danger
                      ? "grid size-10 shrink-0 place-items-center rounded-md border border-[#d9bfa7] bg-[#f7eadb] text-[#8a4d3d]"
                      : "grid size-10 shrink-0 place-items-center rounded-md border border-[#d8cbb8] bg-[#f3eadc] text-[#6f5f4b]"
                  }
                >
                  <AlertTriangle className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold" id="sensitive-confirmation-title">
                    {pending.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#655b50]">{pending.description}</p>
                </div>
              </div>
              <button
                aria-label="Cancel sensitive action"
                className="rounded-md p-2 text-[#5f554b] hover:bg-[#eadfce]"
                onClick={() => close({ confirmed: false })}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            {pending.confirmText && (
              <label className="mt-5 grid gap-2 text-sm font-medium">
                Type <span className="font-mono text-[#7a4a3b]">{pending.confirmText}</span> to
                continue
                <input
                  autoFocus
                  className="h-11 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 font-mono outline-none focus:border-[#8b765e]"
                  onChange={(event) => setTypedText(event.target.value)}
                  value={typedText}
                />
              </label>
            )}

            {(pending.requireReason || pending.reasonLabel) && (
              <label className="mt-4 grid gap-2 text-sm font-medium">
                {pending.reasonLabel ?? "Reason"}
                <textarea
                  className="min-h-24 rounded-md border border-[#d8cbb8] bg-[#f8f1e7] px-3 py-2 outline-none focus:border-[#8b765e]"
                  onChange={(event) => setReason(event.target.value)}
                  value={reason}
                />
              </label>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button onClick={() => close({ confirmed: false })} variant="secondary">
                {pending.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                className={
                  danger
                    ? "bg-[#7a3f31] text-[#fff7ef] hover:bg-[#653428]"
                    : "bg-[#2f3533] text-[#f8f1e7] hover:bg-[#1f2422]"
                }
                disabled={!canConfirm}
                onClick={() => close({ confirmed: true, reason: reason.trim() || undefined })}
              >
                {pending.actionLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </SensitiveConfirmationContext.Provider>
  );
}

export function useSensitiveConfirmation() {
  const context = useContext(SensitiveConfirmationContext);

  if (!context) {
    throw new Error("useSensitiveConfirmation must be used inside SensitiveConfirmationProvider");
  }

  return context.confirm;
}
