interface PageTitleProps {
  title: string;
  description: string;
}

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#626b73]">
        Commercial Console
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[#202326] sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-[#535b63] sm:text-base">{description}</p>
    </div>
  );
}
