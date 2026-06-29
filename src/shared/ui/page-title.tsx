interface PageTitleProps {
  title: string;
  description: string;
}

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5f5958]">System Console</p>
      <h1 className="mt-3 text-[42px] font-bold leading-none tracking-[-0.045em] text-black sm:text-[56px]">
        {title}
      </h1>
      <p className="mt-4 text-sm font-medium leading-6 text-[#5f5958] sm:text-base">
        {description}
      </p>
    </div>
  );
}
