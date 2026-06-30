import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@shared/lib/cn";

interface ModalProps {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  title: ReactNode;
}

export function Modal({
  children,
  className,
  description,
  footer,
  onClose,
  open,
  title,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#161310]/36 px-4 py-6 backdrop-blur-sm animate-[modalOverlayIn_160ms_ease-out]"
      onClick={onClose}
      role="dialog"
    >
      <div
        className={cn(
          "max-h-[min(86vh,820px)] w-full max-w-2xl overflow-hidden rounded-xl border border-[#d7cec6] bg-[#fffdf8] text-[#181614] shadow-[0_32px_90px_rgb(31_24_18_/_0.24)] animate-[modalPanelIn_220ms_cubic-bezier(0.16,1,0.3,1)]",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-5 border-b border-[#ddd4ca] bg-[#f8f4ee]/84 px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold leading-tight tracking-[-0.035em] text-[#1f1a16]">
              {title}
            </h2>
            {description && (
              <div className="mt-2 text-sm font-medium leading-6 text-[#74695f]">{description}</div>
            )}
          </div>
          <button
            aria-label="Close dialog"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#d7cec6] bg-[#fffdf8] text-[#5f5958] transition-colors hover:bg-[#eee8e1] hover:text-[#181614]"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[calc(min(86vh,820px)-92px)] overflow-y-auto px-6 py-6">
          {children}
        </div>
        {footer && <div className="border-t border-[#ddd4ca] bg-[#f8f4ee]/64 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
