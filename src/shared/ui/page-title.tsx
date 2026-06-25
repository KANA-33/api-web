interface PageTitleProps {
  title: string;
  description: string;
}

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8d7a63]">
        Commercial Console
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[#2d2926] sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-[#625a50] sm:text-base">{description}</p>
    </div>
  );
}
