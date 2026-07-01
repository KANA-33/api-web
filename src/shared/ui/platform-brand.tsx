import type { PlatformStatus } from "@shared/api/contracts";

function getSystemName(status?: PlatformStatus | null) {
  return status?.system_name?.trim() || "Test API";
}

function getLogo(status?: PlatformStatus | null) {
  return status?.logo?.trim();
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "T";
}

interface PlatformBrandHeaderProps {
  status?: PlatformStatus | null;
  subtitle?: string;
}

export function PlatformBrandHeader({ status, subtitle = "" }: PlatformBrandHeaderProps) {
  const name = getSystemName(status);
  const logo = getLogo(status);

  return (
    <>
      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#211d19] text-base font-bold text-[#fffaf3]">
        {logo ? (
          <img alt={`${name} logo`} className="size-full object-cover" src={logo} />
        ) : (
          getInitial(name)
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-lg font-semibold leading-none tracking-[-0.02em] text-[#1f1a16]">
          {name}
        </span>
        {subtitle && <span className="mt-1 block text-xs font-semibold text-[#74695f]">{subtitle}</span>}
      </span>
    </>
  );
}

interface PlatformBrandHeroProps {
  status?: PlatformStatus | null;
}

export function PlatformBrandHero({ status }: PlatformBrandHeroProps) {
  const name = getSystemName(status);
  const logo = getLogo(status);

  if (logo) {
    return (
      <div className="flex flex-col items-center gap-8">
        <img
          alt={`${name} logo`}
          className="max-h-[16rem] w-auto max-w-[min(28rem,72vw)] rounded-[2rem] object-contain shadow-[0_24px_70px_rgb(83_66_48_/_0.12)]"
          src={logo}
        />
        <h1 className="text-center text-6xl font-black leading-none tracking-[-0.06em] text-[#080706] text-balance sm:text-7xl lg:text-8xl">
          {name}
        </h1>
      </div>
    );
  }

  if (name.toLowerCase() !== "test api") {
    return (
      <div className="flex flex-col items-center gap-8">
        <span className="grid size-24 place-items-center rounded-[2rem] bg-[#211d19] text-5xl font-black text-[#fffaf3] shadow-[0_24px_70px_rgb(83_66_48_/_0.14)]">
          {getInitial(name)}
        </span>
        <h1 className="max-w-5xl text-center text-6xl font-black leading-none tracking-[-0.06em] text-[#080706] text-balance sm:text-7xl lg:text-8xl">
          {name}
        </h1>
      </div>
    );
  }

  return (
    <svg
      aria-label={name}
      className="h-auto w-full"
      role="img"
      viewBox="0 0 800 400"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id="landing-ring-mask">
          <circle cx="400" cy="200" fill="none" r="120" stroke="white" strokeWidth="40" />
        </mask>
      </defs>
      <circle cx="400" cy="200" fill="none" r="120" stroke="#020202" strokeWidth="40" />
      <text
        fill="#7f7c78"
        fontFamily="Hanken Grotesk, Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="110"
        fontWeight="900"
        letterSpacing="-2"
        x="460"
        y="235"
      >
        API
      </text>
      <text
        fill="#8b8883"
        fontFamily="Hanken Grotesk, Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="110"
        fontWeight="900"
        letterSpacing="-2"
        mask="url(#landing-ring-mask)"
        x="460"
        y="235"
      >
        API
      </text>
      <text
        fill="#050505"
        fontFamily="Hanken Grotesk, Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="110"
        fontWeight="900"
        letterSpacing="-2"
        x="120"
        y="235"
      >
        TEST
      </text>
      <text
        fill="#ffffff"
        fontFamily="Hanken Grotesk, Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="110"
        fontWeight="900"
        letterSpacing="-2"
        mask="url(#landing-ring-mask)"
        x="120"
        y="235"
      >
        TEST
      </text>
    </svg>
  );
}
