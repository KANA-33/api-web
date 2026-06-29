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
          className="fixed inset-0 z-50 grid place-items-center bg-[#1e1a16]/42 px-4 backdrop-blur-md"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#ddd4ca]/88 bg-[#fffaf4]/94 p-5 text-[#181614] shadow-[0_28px_90px_rgb(49_41_31_/_0.22)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span
                  className={
                    danger
                      ? "grid size-10 shrink-0 place-items-center rounded-xl border border-[#d9c9bd] bg-[#f5eee7] text-[#7f1d1d]"
                      : "grid size-10 shrink-0 place-items-center rounded-xl border border-[#ddd4ca] bg-[#eee8e1] text-[#74695f]"
                  }
                >
                  <AlertTriangle className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold" id="sensitive-confirmation-title">
                    {pending.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#74695f]">{pending.description}</p>
                </div>
              </div>
              <button
                aria-label="Cancel sensitive action"
                className="rounded-lg p-2 text-[#4a433d] transition-colors hover:bg-[#eee8e1]"
                onClick={() => close({ confirmed: false })}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            {pending.confirmText && (
              <label className="mt-5 grid gap-2 text-sm font-medium">
                Type <span className="font-mono text-[#7f1d1d]">{pending.confirmText}</span> to
                continue
                <input
                  autoFocus
                  className="h-11 rounded-lg border border-[#d7cec6] bg-[#fffdf8] px-3 font-mono outline-none focus:border-[#4a433d]"
                  onChange={(event) => setTypedText(event.target.value)}
                  value={typedText}
                />
              </label>
            )}

            {(pending.requireReason || pending.reasonLabel) && (
              <label className="mt-4 grid gap-2 text-sm font-medium">
                {pending.reasonLabel ?? "Reason"}
                <textarea
                  className="min-h-24 rounded-lg border border-[#d7cec6] bg-[#fffdf8] px-3 py-2 outline-none focus:border-[#4a433d]"
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
                    ? "bg-[#7f1d1d] text-[#fffdfd] hover:bg-[#641313]"
                    : "bg-[#211d19] text-[#fffdfd] hover:bg-[#332d27]"
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
