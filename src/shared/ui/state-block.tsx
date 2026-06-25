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
      <p className="text-sm font-medium text-[#837462]">{title}</p>
      <div className="mt-4 grid gap-3">
        <span className="h-3 w-2/3 rounded-full bg-[#e3d6c4]" />
        <span className="h-3 w-1/2 rounded-full bg-[#e3d6c4]" />
      </div>
    </Card>
  );
}

export function EmptyBlock({ title, description, actionLabel, onAction }: StateBlockProps) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#655b50]">{description}</p>
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
    <Card className="border-[#d9bfa7] bg-[#f7eadb]/85">
      <h2 className="text-lg font-semibold text-[#5d3d29]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#6a4e38]">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-5" onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
