interface PageTitleProps {
  eyebrow?: string;
  hideEyebrow?: boolean;
  title: string;
  description?: string;
}

export function PageTitle({ eyebrow = "System Console", hideEyebrow = false, title, description }: PageTitleProps) {
  return (
    <div className="max-w-3xl">
      {!hideEyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#74695f]">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-3 text-[38px] font-semibold leading-none tracking-[-0.035em] text-[#181614] text-balance sm:text-[50px]">
        {title}
      </h1>
      {description && (
        <p className="mt-4 max-w-[62ch] text-sm font-medium leading-7 text-[#74695f] text-pretty">
          {description}
        </p>
      )}
    </div>
  );
}
