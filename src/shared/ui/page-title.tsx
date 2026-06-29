interface PageTitleProps {
  title: string;
  description: string;
}

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#74695f]">
        System Console
      </p>
      <h1 className="mt-3 text-[42px] font-semibold leading-none tracking-[-0.035em] text-[#181614] sm:text-[56px]">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-[#74695f] text-pretty sm:text-base">
        {description}
      </p>
    </div>
  );
}
