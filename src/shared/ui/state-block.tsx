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
      <p className="text-sm font-medium text-[#74695f]">{title}</p>
      <div className="mt-4 grid gap-3">
        <span className="h-3 w-2/3 rounded-full bg-[#e6ded5]" />
        <span className="h-3 w-1/2 rounded-full bg-[#e6ded5]" />
      </div>
    </Card>
  );
}

export function EmptyBlock({ title, description, actionLabel, onAction }: StateBlockProps) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-2 text-sm leading-6 text-[#74695f]">{description}</p>}
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
    <Card className="border-[#d9c9bd] bg-[#f5eee7]/90">
      <h2 className="text-lg font-semibold text-[#181614]">{title}</h2>
      {description && <p className="mt-2 text-sm leading-6 text-[#4a433d]">{description}</p>}
      {actionLabel && onAction && (
        <Button className="mt-5" onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
