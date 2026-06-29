import { Button } from "./button";
import { Card } from "./card";

interface StateBlockProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function LoadingBlock({ title = "Loading" }: Partial<StateBlockProps>) {
  return (
    <Card>
      <p className="text-sm font-medium text-[#5f5958]">{title}</p>
      <div className="mt-4 grid gap-3">
        <span className="h-3 w-2/3 rounded-[2px] bg-[#e3e2e2]" />
        <span className="h-3 w-1/2 rounded-[2px] bg-[#e3e2e2]" />
      </div>
    </Card>
  );
}

export function EmptyBlock({ title, description, actionLabel, onAction }: StateBlockProps) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5f5958]">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-5" onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}

export function ErrorBlock({ title, description, actionLabel, onAction }: StateBlockProps) {
  return (
    <Card className="border-[#d8d2d2] bg-[#f3f1f1]">
      <h2 className="text-lg font-semibold text-[#171717]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#3b3736]">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-5" onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
